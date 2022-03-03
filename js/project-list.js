import { getAllProjects, getProjectById, getAllDivergencePointsByMapId, getCommentsGroupedByQuestionReport, createParentComment, createReplyComment, getUser, getSummaryProjectsByUser, getCommentEngagementByContent, createDivergencePoint } from "./strateegia-api.js";

let users = [];
const accessToken = localStorage.getItem("strateegiaAccessToken");
let intervalCheck = "inactive";
const CHECK_INTERVAL = 1000;
let isDivPointsAlreadyAdded = false;
let isCondicaoDeDisparo = false;

export async function initializeProjectList() {
    // const labs = await getAllProjects(accessToken);
    // console.log("getAllProjects()");
    // console.log(labs);
    // const user = await getUser(accessToken);
    // localStorage.setItem("userId", user.id);
    // let listProjects = [];
    // for (let i = 0; i < labs.length; i++) {
    //     let currentLab = labs[i];
    //     if (currentLab.lab.name == null) {
    //         currentLab.lab.name = "Personal";
    //     }
    //     for (let index = 0; index < currentLab.projects.length; index++) {
    //         const project = currentLab.projects[index];
    //         const newProject = {
    //             "id": project.id,
    //             "title": project.title,
    //             "lab_id": currentLab.lab.id,
    //             "lab_title": currentLab.lab.name
    //         };
    //         const projectMoreInfo = await getProjectById(accessToken, project.id);
    //         const foundUser = projectMoreInfo.users.find(_user => _user.id == user.id);
    //         if (foundUser !== undefined) {
    //             if (foundUser.project_roles.includes("ADMIN") || foundUser.project_roles.includes("MENTOR")) {
    //                 listProjects.push(newProject);
    //             }
    //         }
    //     }
    // }

    const projectsSummary = await getSummaryProjectsByUser(accessToken);
    console.log("getSummaryProjectsByUser()");
    console.log(projectsSummary);
    const listProjects = projectsSummary.content.map(project => {
        if (project.lab.name == null) {
            project.lab.name = "Personal";
        }
        return { id: project.id, title: project.title, labId: project.lab.id, labTitle: project.lab.name, roles: project.my_member_info.project_roles }
    }).filter(project => project.roles.includes("ADMIN") || project.roles.includes("MENTOR"));
    console.log(listProjects);

    let options = d3.select("#projects-list");
    options.selectAll('option').remove();
    listProjects.forEach(function (project) {
        options.append('option').attr('value', project.id).text(`${project.labTitle} -> ${project.title}`);
    });
    options.on("change", () => {
        let selectedProject = d3.select("#projects-list").property('value');
        localStorage.setItem("selectedProject", selectedProject);
        console.log(selectedProject);
        updateMapList(selectedProject);
        stopPeriodicCheck();
        isDivPointsAlreadyAdded = false;
    });

    localStorage.setItem("selectedProject", listProjects[0].id);
    updateMapList(listProjects[0].id);

    initializePeriodicCheckButtonControls();
    initializeQuestionsList();
}

async function updateMapList(selectedProject) {
    users = [];
    let project = await getProjectById(accessToken, selectedProject);
    console.log("getProjectById()");
    console.log(project);
    project.users.forEach(user => {
        users.push({ id: user.id, name: user.name });
    });

    localStorage.setItem("users", JSON.stringify(users));

    let options = d3.select("#maps-list");
    options.selectAll('option').remove();
    project.maps.forEach(function (map) {
        options.append('option').attr('value', map.id).text(map.title);
    });
    options.on("change", () => {
        let selectedMap = d3.select("#maps-list").property('value');
        localStorage.setItem("selectedMap", selectedMap);
        console.log(selectedMap);
        updateDivPointList(selectedMap);
        stopPeriodicCheck();
        isDivPointsAlreadyAdded = false;
    });

    const mapId = project.maps[0].id;
    localStorage.setItem("selectedMap", mapId);
    updateDivPointList(mapId);
}

async function updateDivPointList(selectedMap) {
    getAllDivergencePointsByMapId(accessToken, selectedMap).then(map => {
        console.log("getAllDivergencePointsByMapId()");
        console.log(map);
        let options = d3.select("#divpoints-list");
        options.selectAll("option").remove();
        if (map.content.length > 0) {
            map.content.forEach(function (divPoint) {
                options.append("option").attr("value", divPoint.id).text(divPoint.tool.title);
            });
            options.on("change", () => {
                let selectedDivPoint = d3.select("#divpoints-list").property("value");
                setSelectedDivPoint(selectedDivPoint);
                stopPeriodicCheck();
                isDivPointsAlreadyAdded = false;
            });

            let initialSelectedDivPoint = map.content[0].id;
            setSelectedDivPoint(initialSelectedDivPoint);
        } else {
            console.log("Não há pontos de divergência associados ao mapa selecionado");
            localStorage.setItem("selectedDivPoint", null);
        }
    });
}

async function setSelectedDivPoint(divPointId) {
    localStorage.setItem("selectedDivPoint", divPointId);
    const questions = await getCommentsGroupedByQuestionReport(accessToken, divPointId);

    if (questions.length > 0) {
        console.log(questions);
    } else {
        console.log("Não há respostas associadas ao ponto de divergência selecionado");
    }
    // intervalCheck = setInterval(() => {periodicCheck(divPointId)}, 5000);
}

async function initializePeriodicCheckButtonControls() {
    let button = d3.select("#periodic-check-button");
    button.text("iniciar checagem periódica");
    button.classed("btn-outline-success", true);
    button.on("click", () => {
        if (intervalCheck == "inactive") {
            startPeriodicCheck();
        } else {
            stopPeriodicCheck();
        }
    });
    let intervals = d3.select("#intervals");
    const intervalsOptions = [{ value: "1000", text: "1 segundo" }, { value: "5000", text: "5 segundos" }, { value: "10000", text: "10 segundos" }, { value: "15000", text: "15 segundos" }, { value: "30000", text: "30 segundos" }, { value: "60000", text: "1 minuto" }, { value: "120000", text: "2 minutos" }, { value: "300000", text: "5 minutos" }, { value: "600000", text: "10 minutos" }, { value: "1800000", text: "30 minutos" }, { value: "3600000", text: "1 hora" }];
    intervalsOptions.forEach(function (interval) {
        intervals.append("option").attr("value", interval.value).text(interval.text).classed("dropdown-item", true);
    });
}

function initializeQuestionsList() {
    let comments = [
        "você poderia detalhar um pouco mais sua resposta?",
        "daria para explicar um pouco mais?",
        "se der, fala mais um pouco sobre sua resposta?",
        "tu poderia dar mais detalhes sobre tua resposta?",
        "humm, fiquei com algumas dúvidas sobre sua resposta, poderia dar mais detalhes?",
        "dá um pouquinho mais de detalhes aqui, por favor.",
    ];
    const questions = d3.select("#questions-list");
    questions.text(comments.join("\n"));
    // questions.on("change", () => {
    //     const updatedQuestions = d3.select("#questions-list");
    //     console.log(updatedQuestions.node().value)
    // });
}

function startPeriodicCheck() {
    let button = d3.select("#periodic-check-button");
    let selectedDivPoint = localStorage.getItem("selectedDivPoint");
    if (selectedDivPoint !== null && selectedDivPoint !== "null") {
        const chosenInterval = d3.select("#intervals").property("value");
        intervalCheck = setInterval(() => { periodicCheck(selectedDivPoint) }, chosenInterval);

        button.text("parar checagem periódica");
        button.classed("btn-outline-success", false);
        button.classed("btn-outline-danger", true);
    } else {
        console.log("Não há ponto de divergência selecionado");
    }
}

function stopPeriodicCheck() {
    let button = d3.select("#periodic-check-button");
    clearInterval(intervalCheck);
    intervalCheck = "inactive";
    button.text("iniciar checagem periódica");
    button.classed("btn-outline-success", true);
    button.classed("btn-outline-danger", false);
}

async function periodicCheck(divPointId) {
    console.log(`periodicCheck(): ${divPointId}`);
    statusUpdate();
    // checkParentComments(divPointId);
    const projectId = localStorage.getItem("selectedProject");
    checkCommentEngagementByContent(projectId, divPointId);
}

function statusUpdate() {
    let statusOutput = d3.select("#periodic-check-status");
    statusOutput.classed("alert alert-secondary", true);
    let currentTime = new Date();
    let currentTimeFormatted = d3.timeFormat("%d/%m/%Y %H:%M:%S")(currentTime);
    const parentCommentsCount = localStorage.getItem("parentCommentsCount");
    const potentialCount = localStorage.getItem("potentialCount");
    statusOutput.text(`última checagem: ${currentTimeFormatted}`);
    statusOutput.append("p").text(`contagem de respostas: ${parentCommentsCount}`);
    statusOutput.append("p").text(`limite de disparo: 12`);
    statusOutput.append("p").text(`disparou? ${isCondicaoDeDisparo}`);
}

async function checkCommentEngagementByContent(projectId, divPointId) {
    const listEngagementByDivPoint = await getCommentEngagementByContent(accessToken, projectId);
    const engagementDivPoint = listEngagementByDivPoint.filter(divPoint => divPoint.id === divPointId)[0];
    if (engagementDivPoint !== undefined) {
        console.log(engagementDivPoint);
        const parentCommentsCount = engagementDivPoint.parent_comments_count;
        const questionCount = engagementDivPoint.question_count;
        const potential = engagementDivPoint.potential;
        const peopleActiveCount = engagementDivPoint.people_active_count;
        localStorage.setItem("potentialCount", potential);
        localStorage.setItem("parentCommentsCount", parentCommentsCount);
        const mapId = localStorage.getItem("selectedMap");
        if (parentCommentsCount >= 12) {
            if (!isDivPointsAlreadyAdded) {
                isDivPointsAlreadyAdded = true;
                isCondicaoDeDisparo = true;
                //pitch solução
                await createDivergencePoint(accessToken, mapId, "6193f5537619e5192db196f3", 7, 5)
                //pitch mercado
                await createDivergencePoint(accessToken, mapId, "6193f4be7619e5192db196f2", 8, 5)
            }
        } else {
            isCondicaoDeDisparo = false;
        }
    }
}

async function checkParentComments(divPointId) {
    const questionReport = await getCommentsGroupedByQuestionReport(accessToken, divPointId);

    questionReport.forEach(question => {
        const questionId = question.id;
        if (question.comments.length > 0) {
            question.comments.forEach(comment => {
                if (comment.reply_count === 0) {
                    console.log(`${comment.id}: ninguém fez comentários para essa resposta`);
                    createReplyComment(accessToken, comment.id, randomComment());
                }
            });
        }
    });
    console.log(questionReport);
}

function randomComment() {
    let comments = d3.select("#questions-list").node().value.split("\n");
    console.log(comments);
    let randomIndex = Math.floor(Math.random() * comments.length);
    return comments[randomIndex];
}

import { getAllProjects, getProjectById, getAllDivergencePointsByMapId, getCommentsGroupedByQuestionReport, createParentComment, createReplyComment, getUser, getSummaryProjectsByUser, getCommentEngagementByContent, createDivergencePoint } from "./strateegia-api.js";

let users = [];
const accessToken = localStorage.getItem("strateegiaAccessToken");
let intervalCheck = "inactive";
const CHECK_INTERVAL = 1000;
let isDivPointsAlreadyAdded = false;
let isCondicaoDeDisparo = false;

const comparisonParameters = {
    "variable": "people_active_count",
    "condition": "maior",
    "comparisonValue": "0",
    "action": "comment",
    "variableValue": "0"
};

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
    initializeOptions();
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

function initializeOptions() {
    let variables = [
        { text: "quantidade pessoas ativas", value: "people_active_count" },
        // { text: "respostas por questão", value: "answers_by_question" },
        // { text: "respostas por pessoa", value: "answers_by_user" },
        { text: "respostas por divpoint", value: "parent_comments_count" },
        // { text: "comentários por questão", value: "comments_by_question" },
        // { text: "comentários por pessoa", value: "comments_by_user" },
        { text: "comentários por divpoint", value: "reply_comments_count" },
        // { text: "curtidas por questão", value: "likes_by_question" },
        // { text: "curtidas por pessoa", value: "likes_by_user" },
        { text: "curtidas por divpoint", value: "agreements_comments_count" },
        // { text: "tempo desde a última resposta (segundos)", value: "time_since_last_answer" },
        // { text: "tempo desde o último comentário (segundos)", value: "time_since_last_comment" },
        // { text: "tempo desde a última interação no divpoint (segundos)", value: "time_since_last_interaction" },
    ];
    //=======================
    const variaveis = d3.select("#variaveis");
    variables.forEach(function (variable) {
        variaveis.append("option").attr("value", variable.value).text(variable.text).classed("dropdown-item", true);
    });
    variaveis.on("change", () => {
        comparisonParameters.variable = d3.select("#variaveis").property("value");
        console.log(comparisonParameters);
    });
    //=======================
    let conditions = [
        { text: "maior que", value: "maior" },
        { text: "menor que", value: "menor" },
        { text: "igual", value: "igual" },
        { text: "diferente", value: "diferente" },
    ];
    const condicoes = d3.select("#condicoes");
    conditions.forEach(function (condition) {
        condicoes.append("option").attr("value", condition.value).text(condition.text).classed("dropdown-item", true);
    });
    condicoes.on("change", () => {
        comparisonParameters.condition = d3.select("#condicoes").property("value");
        console.log(comparisonParameters);
    });
    //=======================
    const valor = d3.select("#valor-comparacao");
    valor.node().value = "0";

    valor.on("change", () => {
        comparisonParameters.comparisonValue = d3.select("#valor-comparacao").node().value;
        console.log(comparisonParameters);
    });
    //=======================
    let actions = [
        { action: "fazer comentário a partir da lista abaixo", value: "comment" },
        { action: "adicionar o kit abaixo", value: "addKit" },
        { action: "lançar um alerta na tela", value: "alert" },
    ];
    const acoes = d3.select("#acoes");
    actions.forEach(function (action) {
        acoes.append("option").attr("value", action.value).text(action.action).classed("dropdown-item", true);
    });
    acoes.on("change", () => {
        comparisonParameters.action = d3.select("#acoes").property("value");
        console.log(comparisonParameters);
    });
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

// async function checkCommentEngagementByContent(projectId, divPointId) {
//     const listEngagementByDivPoint = await getCommentEngagementByContent(accessToken, projectId);
//     const engagementDivPoint = listEngagementByDivPoint.filter(divPoint => divPoint.id === divPointId)[0];
//     if (engagementDivPoint !== undefined) {
//         console.log(engagementDivPoint);
//         const parentCommentsCount = engagementDivPoint.parent_comments_count;
//         const questionCount = engagementDivPoint.question_count;
//         const potential = engagementDivPoint.potential;
//         const peopleActiveCount = engagementDivPoint.people_active_count;
//         localStorage.setItem("potentialCount", potential);
//         localStorage.setItem("parentCommentsCount", parentCommentsCount);
//         const mapId = localStorage.getItem("selectedMap");
//         if (parentCommentsCount >= 12) {
//             if (!isDivPointsAlreadyAdded) {
//                 isDivPointsAlreadyAdded = true;
//                 isCondicaoDeDisparo = true;
//                 //pitch solução
//                 await createDivergencePoint(accessToken, mapId, "6193f5537619e5192db196f3", 7, 5)
//                 //pitch mercado
//                 await createDivergencePoint(accessToken, mapId, "6193f4be7619e5192db196f2", 8, 5)
//             }
//         } else {
//             isCondicaoDeDisparo = false;
//         }
//     }
// }

async function checkCommentEngagementByContent(projectId, divPointId) {
    const listEngagementByDivPoint = await getCommentEngagementByContent(accessToken, projectId);
    const engagementDivPoint = listEngagementByDivPoint.filter(divPoint => divPoint.id === divPointId)[0];
    if (engagementDivPoint !== undefined) {
        console.log(engagementDivPoint);
        const variableFromAPI = engagementDivPoint[comparisonParameters.variable];
        comparisonParameters.variableValue = variableFromAPI;
        d3.select("#valor-variavel").text(variableFromAPI);
        if (comparisonParameters.condition === "maior") {
            if (variableFromAPI > comparisonParameters.comparisonValue) {
                isCondicaoDeDisparo = true;
            } else {
                isCondicaoDeDisparo = false;
            }
        } else if (comparisonParameters.condition === "menor") {
            if (variableFromAPI < comparisonParameters.comparisonValue) {
                isCondicaoDeDisparo = true;
            } else {
                isCondicaoDeDisparo = false;
            }
        } else if (comparisonParameters.condition === "igual") {
            if (variableFromAPI === comparisonParameters.comparisonValue) {
                isCondicaoDeDisparo = true;
            } else {
                isCondicaoDeDisparo = false;
            }
        } else if (comparisonParameters.condition === "diferente") {
            if (variableFromAPI !== comparisonParameters.comparisonValue) {
                isCondicaoDeDisparo = true;
            } else {
                isCondicaoDeDisparo = false;
            }
        } else {
            console.log("Condição de disparo não definida");
        }
        d3.select("#resultado-condicao").text(isCondicaoDeDisparo ? "verdadeiro" : "falso");

        if (isCondicaoDeDisparo) {
            if (comparisonParameters.action === "alert") {
                alert("Condição de disparo atingida");
            } else if (comparisonParameters.action === "comment") {
                console.log("Comentando as questões");
            } else if (comparisonParameters.action === "addKit") {
                console.log("Criando ponto de divergência");
            }
        } else {
            console.log("Condição de disparo não atingida");
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

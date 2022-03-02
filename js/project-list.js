import { getAllProjects, getProjectById, getAllDivergencePointsByMapId, getCommentsGroupedByQuestionReport } from "./strateegia-api.js";

let users = [];
const accessToken = localStorage.getItem("strateegiaAccessToken");
let intervalCheck = "inactive";

export async function initializeProjectList() {
    const labs = await getAllProjects(accessToken)
    console.log("getAllProjects()");
    console.log(labs);
    let listProjects = [];
    for (let i = 0; i < labs.length; i++) {
        let currentLab = labs[i];
        if (currentLab.lab.name == null) {
            currentLab.lab.name = "Personal";
        }
        for (let j = 0; j < currentLab.projects.length; j++) {
            const project = currentLab.projects[j];
            const newProject = {
                "id": project.id,
                "title": project.title,
                "lab_id": currentLab.lab.id,
                "lab_title": currentLab.lab.name
            };
            listProjects.push(newProject);
        }
    }

    let options = d3.select("#projects-list");
    options.selectAll('option').remove();
    listProjects.forEach(function (project) {
        options.append('option').attr('value', project.id).text(`${project.lab_title} -> ${project.title}`);
    });
    options.on("change", () => {
        let selectedProject = d3.select("#projects-list").property('value');
        localStorage.setItem("selectedProject", selectedProject);
        console.log(selectedProject);
        updateMapList(selectedProject);
        stopPeriodicCheck();
    });

    localStorage.setItem("selectedProject", listProjects[0].id);
    updateMapList(listProjects[0].id);

    initializePeriodicCheckButtonControls();
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

function initializePeriodicCheckButtonControls() {
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
}

function startPeriodicCheck() {
    let button = d3.select("#periodic-check-button");
    let selectedDivPoint = localStorage.getItem("selectedDivPoint");
    if (selectedDivPoint !== null && selectedDivPoint !== "null") {
        intervalCheck = setInterval(() => { periodicCheck(selectedDivPoint) }, 500);

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
}

function statusUpdate() {
    let statusOutput = d3.select("#periodic-check-status");
    statusOutput.classed("alert alert-secondary", true);
    let currentTime = new Date();
    let currentTimeFormatted = d3.timeFormat("%d/%m/%Y %H:%M:%S")(currentTime);
    statusOutput.text("última checagem: " + currentTimeFormatted);
}

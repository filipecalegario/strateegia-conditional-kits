export function initializeNewKitTextArea(elementId) {
  let kitTemplate = [
    "TÍTULO: digite aqui o título do seu kit",
    "COR: digite a cor do seu kit a partir dessa lista: [YELLOW, PINK, MAGENTA, BLUE, PURPLE, ORANGE, TEAL]",
    "DESCRIÇÃO: digite aqui uma breve descrição do seu kit",
    "QUESTÃO: digite aqui a 1ª questão do seu kit",
    "QUESTÃO: digite aqui a 2ª questão do seu kit",
    "QUESTÃO: digite aqui a 3ª questão do seu kit",
    "REF: [digite aqui a descrição da 1ª referência](digite o link para a 1ª referência)",
    "REF: [digite aqui a descrição da 2ª referência](digite o link para a 2ª referência)",
    "REF: [digite aqui a descrição da 3ª referência](digite o link para a 3ª referência)",
  ];
  const textarea = d3.select(`#${elementId}`);
  textarea.text(kitTemplate.join("\n"));
}

export async function prepareKitForCreation(kitToBeCreated) {
  const responseFromCreateTool = await createTool(accessToken,
    kitToBeCreated.title,
    kitToBeCreated.color,
    kitToBeCreated.description,
    kitToBeCreated.questions,
    kitToBeCreated.references);
  console.log(responseFromCreateTool);
  let statusOutput = d3.select("#response-status");
  let outputMessage = "";
  if (responseFromCreateTool.status === undefined) {
    statusOutput.classed("alert alert-danger", false);
    statusOutput.classed("alert alert-success", true);
    outputMessage = "Kit criado com sucesso!";
  } else {
    statusOutput.classed("alert alert-success", false);
    statusOutput.classed("alert alert-danger", true);
    outputMessage = "Erro ao criar o kit!";
  }
  // define the text with JSON format and the status
  statusOutput.text(outputMessage);
  statusOutput.append("pre").style("white-space", "pre-wrap").text(JSON.stringify(responseFromCreateTool, null, 2));
}

export function parseTextArea() {
  let lines = d3.select("#main-textarea").node().value.split("\n");
  const kit = {};
  kit.title = lines[0].replace("TÍTULO: ", "");
  kit.color = lines[1].replace("COR: ", "");
  kit.description = lines[2].replace("DESCRIÇÃO: ", "");
  kit.questions = [];
  kit.references = [];
  for (let i = 3; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("QUESTÃO: ")) {
      const question = line.replace("QUESTÃO: ", "");
      kit.questions.push({ "question": question });
    }
    if (line.startsWith("REF: ")) {
      const ref = line.replace("REF: ", "");
      const description = extractTextBetweenBrackets(ref)[0];
      const url = extractTextBetweenParentheses(ref)[0];
      kit.references.push({
        "description": description,
        "url": url
      });
    }
  }
  return kit;
}

// function that extract the text between brackets
function extractTextBetweenBrackets(text) {
  const regex = /\[(.*?)\]/g;
  let match;
  let result = [];
  while ((match = regex.exec(text)) !== null) {
    result.push(match[1]);
  }
  return result;
}

//function that extracts the text between parentheses
function extractTextBetweenParentheses(text) {
  const regex = /\((.*?)\)/g;
  let match;
  let result = [];
  while ((match = regex.exec(text)) !== null) {
    result.push(match[1]);
  }
  return result;
}
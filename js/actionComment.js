export function initializeCommentTextArea(elementId) {
  let comments = [
    "você poderia detalhar um pouco mais sua resposta?",
    "daria para explicar um pouco mais?",
    "se der, fala mais um pouco sobre sua resposta?",
    "tu poderia dar mais detalhes sobre tua resposta?",
    "humm, fiquei com algumas dúvidas sobre sua resposta, poderia dar mais detalhes?",
    "dá um pouquinho mais de detalhes aqui, por favor.",
  ];
  const textarea = d3.select(`#${elementId}`);
  textarea.text(comments.join("\n"));
}
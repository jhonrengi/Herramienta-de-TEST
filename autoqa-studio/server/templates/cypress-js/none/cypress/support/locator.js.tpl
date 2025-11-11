function resolveByText(doc, text) {
  const normalized = text.trim();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.textContent && current.textContent.trim() === normalized) {
      return current;
    }
    current = walker.nextNode();
  }
  return null;
}

function resolveSelector(doc, selector) {
  if (!selector) {
    return null;
  }

  const trimmed = selector.trim();

  if (trimmed.startsWith('text=')) {
    return resolveByText(doc, trimmed.substring(5));
  }

  if (trimmed.startsWith('//') || trimmed.startsWith('(')) {
    try {
      const result = doc.evaluate(trimmed, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return result.singleNodeValue;
    } catch (error) {
      console.warn('XPath inválido', trimmed, error);
      return null;
    }
  }

  try {
    return doc.querySelector(trimmed);
  } catch (error) {
    console.warn('Selector CSS inválido', trimmed, error);
    return null;
  }
}

export function getByChain(candidate) {
  const tries = [candidate?.css, candidate?.xpath, ...(candidate?.fallbacks || [])].filter(Boolean);
  if (!tries.length) {
    throw new Error('No hay selectores disponibles para este elemento');
  }

  return cy.document().then(doc => {
    for (const sel of tries) {
      const element = resolveSelector(doc, sel);
      if (element) {
        return cy.wrap(element);
      }
    }
    throw new Error('No se encontró ningún elemento usando la cadena de selectores proporcionada');
  });
}

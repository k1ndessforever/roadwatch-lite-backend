// backend/utils/sanitizer.js
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
}

function sanitizeHTML(html) {
  return DOMPurify.sanitize(html);
}

module.exports = {
  sanitizeInput,
  sanitizeHTML
};

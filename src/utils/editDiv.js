const f = 'function';
const o = 'object';

const convertToText = (str = '') => {
    // Ensure string.
    let value = String(str);
  
    // Convert encoding.
    value = value.replace(/&nbsp;/gi, ' ');
    value = value.replace(/&amp;/gi, '&');
  
    // Replace `<br>`.
    value = value.replace(/<br>/gi, '\n');
  
    // Replace `<div>` (from Chrome).
    value = value.replace(/<div>/gi, '\n');
  
    // Replace `<p>` (from IE).
    value = value.replace(/<p>/gi, '\n');
  
    // Remove extra tags.
    value = value.replace(/<(.*?)>/g, '');
  
    // Trim each line.
    value = value
      .split('\n')
      .map((line = '') => {
        return line.trim();
      })
      .join('\n');
  
    // No more than 2x newline, per "paragraph".
    value = value.replace(/\n\n+/g, '\n\n');
  
    // Clean up spaces.
    value = value.replace(/[ ]+/g, ' ');
    value = value.trim();
  
    // Expose string.
    return value;
  };
  
const convertToMarkup = (str = '') => {
    return convertToText(str).replace(/\n/g, '<br />');
};

const convertOnPaste = (
  event = {
    preventDefault() {},
  }
) => {
  console.log('called');
  // Prevent paste.
  event.preventDefault();

  // Set later.
  let value = '';

  // Does method exist?
  const hasEventClipboard = !!(
    event.clipboardData &&
    typeof event.clipboardData === o &&
    typeof event.clipboardData.getData === f
  );

  // Get clipboard data?
  if (hasEventClipboard) {
    value = event.clipboardData.getData('text/plain');
  }

  // Insert into temp `<textarea>`, read back out.
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  value = textarea.innerText;

  // Clean up text.
  value = convertToText(value);

  // Insert text.
  if (typeof document.execCommand === f) {
    document.execCommand('insertText', false, value);
  }
};

export { convertToMarkup,convertToText,convertOnPaste };
/**
 * Handles fetch requests.
 */
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});


/**
 * Handles fetch requests by displaying a random site variant.
 * @param {Object} request the fetch request
 */
async function handleRequest(request) {
  let variant;
  return getVariants(request)
    .then(variants => {
        variant = getRandomElement(variants);
        return getVariantText(variant);
    }).then(variantText => prepareResponse(variantText))
    .then(response => transformResponse(response, variant));
}

/**
 * Fetches list of variants if no variant exists in session cookie.
 * @param {Object} request the fetch request
 */
async function getVariants(request) {
  const storedVariant = getCookie(request, 'variant');
  return (storedVariant) ? [storedVariant] : 
    fetch('https://cfw-takehome.developers.workers.dev/api/variants')
      .then(response => response.json())
      .then(data => data.variants);
}

/**
 * Gets a cookie from a request by name.
 * @param {Object} request the fetch request
 * @param {string} name the name of the cookie
 */
function getCookie(request, name) {
  // regular expression credited to https://javascript.info/cookie
  const cookies = request.headers.get('Cookie');
  const cookie = (cookies) ? cookies.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  )) : undefined;
  return cookie ? cookie[1] : undefined;
}

/**
 * Gets a random element from a list.
 * @param {Object[]} elements the list of elements
 */
function getRandomElement(elements) {
  return elements[Math.floor(Math.random() * elements.length)];
}

/**
 * Fetches html text from a url.
 * @param {string} variant the url of the desired html
 */
async function getVariantText(variant) {
  return {
    'text': await fetch(variant, { 
      headers: { 
        'Content-Type': 'text/html;charset=UTF-8', 
      }}).then(response => response.text()),
    'url': variant,
  };
}

/**
 * Generates a request response with a html text body while storing its respective
 * url in a session cookie.
 * @param {Object} variant a wrapper object storing html text and its url
 */
function prepareResponse(variant) {
  return new Response(variant.text, {
    headers: {
      'Content-Type': 'text/html;charset=UTF-8',
      'Set-Cookie': `variant=${variant.url}`,
    },
  });
}

/**
 * Modifies the html text of a response given its url. Each variant maps to
 * different html content.
 * @param {Object} response the request response
 * @param {*} variant the request response's url
 */
async function transformResponse(response, variant) {
  // maps a url to its respective html content
  const contentMap = {
    'https://cfw-takehome.developers.workers.dev/variants/1': {
      'pageTitle': 'Variant 1',
      'title': 'Full-Stack Internship Application',
      'description': 'Thank you for considering my application to Cloudflare!',
      'linkText': 'View the repository.',
      'url': 'https://github.com/LukeAVanDrie/internship-application-fullstack',
    },
    'https://cfw-takehome.developers.workers.dev/variants/2': {
      'pageTitle': 'Variant 2',
      'title': 'About Me',
      'description': 'My name is Luke Van Drie, and I am a sophomore studying '
        + 'computer science and mathematics at UNL.',
      'linkText': 'Please join my LinkedIn network!',
      'url': 'https://www.linkedin.com/in/luke-van-drie',
    },
  }

  // uses Cloudflare's HTMLRewriter class to modify the contents of the response html text
  const content = contentMap[variant];
  return new HTMLRewriter()
    .on('title', new ElementHandler(content.pageTitle))
    .on('h1#title', new ElementHandler(content.title))
    .on('p#description', new ElementHandler(content.description))
    .on('a#url', new ElementHandler(content.linkText, 'href', content.url))
    .transform(response);
}

/**
 * Models an element handler for rewrite requests on different elements' inner content
 * with the option of also editing elements' attribute contents.
 */
class ElementHandler {
  constructor(content, attribute = undefined, attributeContent = '') {
    this.attribute = attribute;
    this.attributeContent = attributeContent;
    this.content = content;
  }

  element(element) {
    element.setInnerContent(this.content);
    if (this.attribute) {
      element.setAttribute(this.attribute, this.attributeContent);
    }
  }
}
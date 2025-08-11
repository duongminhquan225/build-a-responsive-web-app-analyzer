class WebAppAnalyzer {
  constructor(url) {
    this.url = url;
    this.dimensions = {
      mobile: { width: 480, height: 640 },
      tablet: { width: 768, height: 1024 },
      desktop: { width: 1200, height: 800 }
    };
    this.analyzedData = {};
  }

  analyze() {
    return new Promise((resolve, reject) => {
      // Send request to URL and parse HTML
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.status === 200) {
          const html = xhr.responseText;
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          this.analyzeDOM(doc);
          resolve(this.analyzedData);
        } else {
          reject(xhr.statusText);
        }
      };
      xhr.open('GET', this.url, true);
      xhr.send();
    });
  }

  analyzeDOM(doc) {
    this.analyzedData.breakpoints = [];
    this.analyzedData.mediaQueries = [];

    // Analyze breakpoints
    const stylesheets = doc.querySelectorAll('link[rel="stylesheet"]');
    stylesheets.forEach((stylesheet) => {
      const rules = stylesheet.sheet.cssRules;
      rules.forEach((rule) => {
        if (rule.type === 4) { // RULE_MEDIA
          const mediaQuery = rule.media.mediaText;
          const maxWidth = this.getMaxWidthFromMediaQuery(mediaQuery);
          if (maxWidth) {
            this.analyzedData.breakpoints.push(maxWidth);
          }
        }
      });
    });

    // Analyze media queries
    this.analyzedData.mediaQueries = Array.prototype.slice
      .call(doc.querySelectorAll('style, link[rel="stylesheet"]'))
      .reduce((acc, stylesheet) => {
        const stylesheetText = stylesheet.innerHTML || stylesheet.href;
        const mediaQueryRegex = /\@media[^{]+{([^\}]+)}/g;
        let match;
        while ((match = mediaQueryRegex.exec(stylesheetText)) !== null) {
          acc.push(match[1].trim());
        }
        return acc;
      }, []);

    // Analyze responsiveness
    Object.keys(this.dimensions).forEach((dimension) => {
      const { width, height } = this.dimensions[dimension];
      const viewportWidth = width;
      const viewportHeight = height;
      const iframe = document.createElement('iframe');
      iframe.src = this.url;
      iframe.width = viewportWidth;
      iframe.height = viewportHeight;
      document.body.appendChild(iframe);
      const iframeContentWindow = iframe.contentWindow;
      const iframeDocument = iframeContentWindow.document;
      this.analyzedData.responsiveness = {
        ...this.analyzedData.responsiveness,
        [dimension]: {
          isResponsive: this.isResponsive(iframeDocument, viewportWidth, viewportHeight)
        }
      };
      document.body.removeChild(iframe);
    });
  }

  getMaxWidthFromMediaQuery(mediaQuery) {
    const regex = /\(max-width:\s*(\d+)px\)/;
    const match = regex.exec(mediaQuery);
    return match && parseInt(match[1], 10);
  }

  isResponsive(doc, viewportWidth, viewportHeight) {
    const elements = doc.querySelectorAll('*');
    return Array.prototype.every.call(elements, (element) => {
      const rect = element.getBoundingClientRect();
      return rect.width <= viewportWidth && rect.height <= viewportHeight;
    });
  }
}

module.exports = WebAppAnalyzer;
(function (d, w) {
'use strict';

var pointsRegEx = /^\(([\d\.]+)\)(.+)/i;

var debounce = function (func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

var resetStoryPointsForColumn = (column) => {
  const customElements = Array.from(column.getElementsByClassName('github-project-story-points'));
  for (let e of customElements) {
    const parent = e.parentNode;
    if (parent.dataset.gpspOriginalContent) {
      parent.innerText = parent.dataset.gpspOriginalContent;
      delete parent.dataset.gpspOriginalContent;
    } else {
      parent.removeChild(e);
    }
  }
};

var titleWithPoints = (title, points) => (`
  <span class="github-project-story-points counter">
    <span style="display:none">(</span>${points}<span style="display:none">)</span>
  </span>
  ${title}
`);

var titleWithTotalPoints = (title, points) => (`${title}
  <small class="github-project-story-points">(${points} ${points === 1 ? 'point' : 'points'})</small>`
);

var addStoryPointsForColumn = (column) => {
  const columnCards = Array
    .from(column.getElementsByClassName('issue-card'))
    .filter(card => !card.classList.contains('sortable-ghost'))
    .map(card => {
      const titleElementContainer = Array
        .from(card.getElementsByTagName('h5'))
        .concat(Array.from(card.getElementsByTagName('p')))[0];
      const titleElementLink = (
        titleElementContainer.getElementsByTagName &&
        titleElementContainer.getElementsByTagName('a') ||
        []
      );
      const titleElement = (
        titleElementLink.length > 0
        ? titleElementLink[0]
        : titleElementContainer
      );
      const title = titleElementContainer.innerText;
      const story = (
        pointsRegEx.exec(titleElement.innerText) ||
        [null, '0', titleElement.innerText]
      );
      const storyPoints = parseFloat(story[1]);
      const storyTitle = story[2];
      return {
        element: card,
        titleElement,
        title,
        titleNoPoints: storyTitle,
        storyPoints,
      };
    });
  const columnCountElement = column.getElementsByClassName('js-column-card-count')[0];
  const columnStoryPoints = columnCards.reduce((acc, card) => acc + card.storyPoints, 0);

  // Apply DOM changes
  if (columnStoryPoints) {
    columnCountElement.innerHTML = titleWithTotalPoints(columnCards.length, columnStoryPoints);
  }

  for (let card of columnCards) {
    if (card.storyPoints) {
      card.titleElement.dataset.gpspOriginalContent = card.title;
      card.titleElement.innerHTML = titleWithPoints(card.titleNoPoints, card.storyPoints);
    }
  }
};

var resets = [];

var start = debounce(() => {
  // Reset
  for (let reset of resets) {
    reset();
  }
  resets = [];
  // Projects
  const projects = d.getElementsByClassName('project-columns-container');
  if (projects.length > 0) {
    const project = projects[0];
    const columns = Array.from(project.getElementsByClassName('col-project-custom'));
    for (let column of columns) {
      const addStoryPoints = ((c) => debounce(() => {
        resetStoryPointsForColumn(c);
        addStoryPointsForColumn(c);
      }, 50))(column);
      column.addEventListener('DOMSubtreeModified', addStoryPoints);
      column.addEventListener('drop', addStoryPoints);
      addStoryPointsForColumn(column);
      resets.push(((c) => () => {
        resetStoryPointsForColumn(c);
        column.removeEventListener('DOMSubtreeModified', addStoryPoints);
        column.removeEventListener('drop', addStoryPoints);
      })(column));
    }
  }
  // Issues
  const issues = Array.from(d.getElementsByClassName('js-issue-row'));
  for (let issue of issues) {
    const titleElement = issue.getElementsByClassName('h4')[0];
    const story = (
      pointsRegEx.exec(titleElement.innerText) ||
      [null, '0', titleElement.innerText]
    );
    const storyPoints = parseFloat(story[1]);
    const storyTitle = story[2];
    if (storyPoints) {
      titleElement.innerHTML = titleWithPoints(storyTitle, storyPoints);
    }
  }
}, 50);

// Hacks to restart the plugin on pushState change
w.addEventListener('statechange', () => setTimeout(() => {
  const timelines = d.getElementsByClassName('new-discussion-timeline');
  if (timelines.length > 0) {
    const timeline = timelines[0];
    const startOnce = () => {
      timeline.removeEventListener('DOMSubtreeModified', startOnce);
      start();
    };
    timeline.addEventListener('DOMSubtreeModified', startOnce);
  }
  start();
}, 500));

// First start
start();

})(document, window);

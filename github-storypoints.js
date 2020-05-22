(function (d, w) {
'use strict';

var pointsRegEx = /^(\(([\d\.]+)\)\s*)?(.+?)(\s*\[([\d\.]+)\])?$/im; // new RegExp("^(\(([\d\.]+)\))?(.+)(\[([\d\.]+)\])?$", "i"); // Was: /^\(([\d\.]+)\)(.+)/i; 

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

var pluralize = (value) => (
  value === 1 ? '' : 's'
);

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

var titleWithPoints = (title, points, spent) => (
  `<span style="font-weight:bold">${title}</span><br \>
  <span class="github-project-story-points counter"
  style="font-size:xx-small">${spent} spent of ${points}</span>`
);

var titleWithTotalPoints = (title, points, spent) => (
    `${title}<span class="github-project-story-points" style="font-size:xx-small"> item${pluralize(title)} (${spent} spent of ${points})</span>`
);

var addStoryPointsForColumn = (column) => {
  const columnCards = Array
    .from(column.getElementsByClassName('issue-card'))
    .filter(card => !card.classList.contains('sortable-ghost'))
    .map(card => {
      const titleElementContainer = Array
        .from(card.getElementsByClassName('h5'))
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
      const storyPoints = parseFloat(story[2]) || 0;
      const storyTitle = story[3];
      const spentPoints = parseFloat(story[5]) || 0;
      return {
        element: card,
        titleElement,
        title,
        titleNoPoints: storyTitle,
        storyPoints,
        spentPoints,
      };
    });
  const columnCountElement = column.getElementsByClassName('js-column-card-count')[0];

  let columnStoryPoints = 0;
  let columnSpentPoints = 0;
  for (let card of columnCards) {
    columnStoryPoints += card.storyPoints;
    columnSpentPoints += card.spentPoints;
    if (card.storyPoints || card.spentPoints) {
      card.titleElement.dataset.gpspOriginalContent = card.title;
      card.titleElement.innerHTML = titleWithPoints(card.titleNoPoints, card.storyPoints, card.spentPoints);
    }
  }
  // Apply DOM changes:
  if (columnStoryPoints || columnSpentPoints) {
    columnCountElement.innerHTML = titleWithTotalPoints(columnCards.length, columnStoryPoints, columnSpentPoints);
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
    const columns = Array.from(project.getElementsByClassName('js-project-column')); // Was 'col-project-custom', but that's gitenterprise; github.com is 'project-column', fortunately, both have 'js-project-column'
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
    const storyPoints = parseFloat(story[2]) || 0;
    const storyTitle = story[3];
    const spentPoints = parseFloat(story[5]) || 0;
    if (storyPoints || spentPoints) {
      titleElement.innerHTML = titleWithPoints(storyTitle, storyPoints, spentPoints);
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

(function () {
  var courses = window.CURRICULUM || [];
  var search = document.getElementById("search");
  var levelButtons = Array.prototype.slice.call(document.querySelectorAll("[data-level]"));
  var root = document.getElementById("courses");
  var level = "all";

  if (!courses.length || !search || !root) {
    throw new Error("Curriculum catalog could not be initialized.");
  }

  var searchClone = search.cloneNode(true);
  search.parentNode.replaceChild(searchClone, search);
  search = searchClone;
  levelButtons = levelButtons.map(function (button) {
    var clone = button.cloneNode(true);
    button.parentNode.replaceChild(clone, button);
    return clone;
  });
  var readyToggle = document.querySelector(".ready-toggle");
  if (readyToggle) readyToggle.remove();

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[character];
    });
  }

  document.getElementById("course-count").textContent = courses.length;
  document.getElementById("topic-count").textContent = courses.reduce(function (total, course) {
    return total + course.units.length;
  }, 0);
  document.getElementById("lesson-count").textContent = courses.reduce(function (total, course) {
    return total + course.units.reduce(function (count, item) {
      return count + item.lessons.length;
    }, 0);
  }, 0);

  function render() {
    var query = search.value.trim().toLocaleLowerCase();
    var visibleCount = 0;
    root.innerHTML = courses.map(function (course) {
      if (level !== "all" && course.level !== level) return "";
      var units = course.units.map(function (unit, index) {
        return { unit: unit, index: index };
      }).filter(function (entry) {
        var item = entry.unit;
        var content = [course.name, course.grade, course.meta, item.title, item.standard, item.overview, item.inquiry]
          .concat(item.lessons.map(function (lesson) {
            return lesson.title + " " + lesson.standard + " " + lesson.core.join(" ");
          })).join(" ");
        return !query || content.toLocaleLowerCase().indexOf(query) !== -1;
      });
      if (!units.length) return "";
      visibleCount += units.length;
      return '<details class="course" open><summary><span class="course-name"><b>' +
        escapeHtml(course.grade + " · " + course.name) + '</b><span>' +
        escapeHtml(course.meta) + '</span></span><span class="course-meta">' +
        units.length + '개 단원</span></summary><div class="units">' +
        units.map(function (entry) {
          var item = entry.unit;
          var href = "unit.html?course=" + encodeURIComponent(course.id) + "&unit=" + entry.index;
          return '<article class="unit"><div><b>' + escapeHtml(item.title) +
            '</b><p>' + escapeHtml(item.standard + " · " + item.overview) + '</p></div><div class="actions">' +
            '<a class="action ready" href="' + escapeHtml(href) + '">수업 자료 보기 · ' +
            item.lessons.length + '차시 ↗</a></div></article>';
        }).join("") + "</div></details>";
    }).join("");
    document.getElementById("empty").hidden = visibleCount > 0;
  }

  search.addEventListener("input", render);
  levelButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      level = button.dataset.level;
      levelButtons.forEach(function (item) {
        item.setAttribute("aria-pressed", String(item === button));
      });
      render();
    });
  });
  render();
})();

(function () {
  var courses = window.CURRICULUM || [];
  var params = new URLSearchParams(location.search);
  var course = courses.find(function (item) { return item.id === params.get("course"); });
  var unitIndex = Number(params.get("unit"));
  var unit = course && Number.isInteger(unitIndex) ? course.units[unitIndex] : null;
  var app = document.getElementById("app");

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function safeMediaUrl(value) {
    try {
      var url = new URL(value);
      return url.protocol === "https:" &&
        (url.hostname === "commons.wikimedia.org" || url.hostname === "ko.wikipedia.org" ||
          url.hostname === "upload.wikimedia.org" || url.hostname === "thumb.wikimedia.org" ||
          url.hostname === "creativecommons.org")
        ? url.href : "";
    } catch (error) {
      return "";
    }
  }

  function imageFigure(image, className, lessonTitle) {
    if (!image || image.pending) {
      return '<figure class="' + className + '"><div class="image-status" role="status" aria-live="polite">' +
        'Wikimedia Commons에서 공개 이미지와 이용 조건을 확인하고 있습니다.</div></figure>';
    }
    var imageUrl = safeMediaUrl(image.imageUrl);
    if (!imageUrl) return "";
    var articleUrl = safeMediaUrl(image.articleUrl);
    var commonsUrl = safeMediaUrl(image.commonsUrl);
    var licenseUrl = safeMediaUrl(image.licenseUrl);
    var source = articleUrl
      ? '<a href="' + escapeHtml(articleUrl) + '" target="_blank" rel="noopener">' +
        escapeHtml(image.articleTitle) + '</a>'
      : escapeHtml(image.articleTitle || lessonTitle);
    var license = licenseUrl
      ? '<a href="' + escapeHtml(licenseUrl) + '" target="_blank" rel="noopener">' +
        escapeHtml(image.license) + '</a>'
      : escapeHtml(image.license);
    var original = commonsUrl
      ? '<a href="' + escapeHtml(commonsUrl) + '" target="_blank" rel="noopener">원본·이용 조건</a>'
      : "";
    return '<figure class="' + className + '"><img src="' + escapeHtml(imageUrl) +
      '" alt="' + escapeHtml((image.articleTitle || lessonTitle) + " 자료 이미지") +
      '" loading="eager" decoding="async"><figcaption><span>자료: ' + source +
      '</span><small>이미지 저작자: ' + escapeHtml(image.artist || "원본 페이지의 기여자") +
      ' · ' + license + (original ? ' · ' + original : "") +
      '</small></figcaption></figure>';
  }

  function imageTerms(value) {
    var ignored = ["역사", "시대", "세계", "현대", "근대", "고대", "중세", "이해", "탐구",
      "기초", "수업", "자료", "무엇", "구분", "비교", "읽기", "의미", "발전", "변화",
      "형성", "전개", "과정", "사회", "문화", "국가", "주제", "활동"];
    return String(value).toLowerCase().split(/[^가-힣a-z0-9]+/i).map(function (term) {
      return term.replace(/(으로부터|으로서|에서는|에게서|으로|에서|에게|에는|부터|까지|처럼|보다|하고|이며|들의|들은|들|란|은|는|이|가|을|를|와|과|의|에|로)$/u, "");
    }).filter(function (term) {
      return term.length > 1 && ignored.indexOf(term) === -1;
    });
  }

  function titleRelevance(title, reference) {
    var referenceTerms = imageTerms(reference);
    var candidateTerms = imageTerms(title);
    return referenceTerms.filter(function (term) {
      return candidateTerms.some(function (candidate) {
        return candidate === term || candidate.indexOf(term) !== -1 || term.indexOf(candidate) !== -1;
      });
    }).length;
  }

  function metadataText(value) {
    return String(value || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ")
      .replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ").trim();
  }

  function reusableLicense(value) {
    var license = metadataText(value).toLowerCase();
    if (!license || /non.?commercial|cc\s*by[- ]?nc\b|cc\s*by[- ]?nd\b|no.?derivatives/.test(license)) return false;
    return /^(public domain|cc0|cc by(?:-sa)?(?:\s|$)|cc-by(?:-sa)?(?:-|\s|$)|creative commons attribution(?:-share alike)?|attribution-share alike|pd[- ])/.test(license);
  }

  async function apiJson(url) {
    var response = await fetch(url);
    if (response.status === 429) throw new Error("이미지 검색이 일시적으로 제한되었습니다.");
    if (!response.ok) throw new Error("Wikimedia API 오류 (" + response.status + ").");
    return response.json();
  }

  async function searchWikimediaImage(query, reference) {
    var search = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "0",
      gsrlimit: "10",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "960",
      format: "json",
      origin: "*",
      maxlag: "5"
    });
    var results = await apiJson("https://ko.wikipedia.org/w/api.php?" + search);
    var candidates = Object.values(results.query && results.query.pages || {}).map(function (page) {
      var thumbnail = page.thumbnail;
      if (!thumbnail || !/\/wikipedia\/commons\//.test(new URL(thumbnail.source).pathname)) return null;
      var parts = new URL(thumbnail.source).pathname.split("/");
      var thumbIndex = parts.indexOf("thumb");
      var fileName = decodeURIComponent(thumbIndex >= 0 ? parts[thumbIndex + 3] : parts[parts.length - 1]);
      return {
        articleTitle: page.title,
        imageUrl: thumbnail.source,
        fileTitle: "File:" + fileName,
        relevance: titleRelevance(page.title, reference),
        order: page.index || 99
      };
    }).filter(function (candidate) {
      return candidate && candidate.relevance > 0;
    }).sort(function (first, second) {
      return second.relevance - first.relevance || first.order - second.order;
    }).slice(0, 6);

    if (!candidates.length) return null;
    var metadataQuery = new URLSearchParams({
      action: "query",
      titles: candidates.map(function (candidate) { return candidate.fileTitle; }).join("|"),
      prop: "imageinfo",
      iiprop: "url|extmetadata",
      iiurlwidth: "960",
      format: "json",
      origin: "*",
      maxlag: "5"
    });
    var metadata = await apiJson("https://commons.wikimedia.org/w/api.php?" + metadataQuery);
    var files = Object.values(metadata.query && metadata.query.pages || {});
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      var file = files.find(function (item) { return item.title === candidate.fileTitle; });
      var info = file && file.imageinfo && file.imageinfo[0];
      var details = info && info.extmetadata || {};
      if (!info || !reusableLicense(details.LicenseShortName && details.LicenseShortName.value)) continue;
      var imageUrl = safeMediaUrl(info.thumburl || info.url || candidate.imageUrl);
      var commonsUrl = safeMediaUrl(info.descriptionurl);
      if (!imageUrl || !commonsUrl) continue;
      var articleUrl = "https://ko.wikipedia.org/wiki/" + encodeURIComponent(candidate.articleTitle.replace(/ /g, "_"));
      return {
        imageUrl: imageUrl,
        articleTitle: candidate.articleTitle,
        articleUrl: articleUrl,
        commonsUrl: commonsUrl,
        artist: metadataText(details.Artist && details.Artist.value || details.Credit && details.Credit.value) ||
          "원본 페이지의 기여자",
        license: metadataText(details.LicenseShortName && details.LicenseShortName.value),
        licenseUrl: metadataText(details.LicenseUrl && details.LicenseUrl.value)
      };
    }
    return null;
  }

  async function resolveLessonImage(lesson, figure) {
    try {
      var image = await searchWikimediaImage(lesson.title, lesson.title);
      if (!image) image = await searchWikimediaImage(unit.title, unit.title);
      if (image) {
        figure.outerHTML = imageFigure(image, figure.className, lesson.title);
        return;
      }
      var searchUrl = "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=" +
        encodeURIComponent(lesson.title);
      figure.innerHTML = '<div class="image-status" role="status">이 차시와 관련해 재사용 조건이 확인된 이미지를 자동으로 찾지 못했습니다. ' +
        '<a href="' + escapeHtml(searchUrl) + '" target="_blank" rel="noopener">Wikimedia Commons에서 직접 찾기</a></div>';
    } catch (error) {
      var fallbackUrl = "https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=" +
        encodeURIComponent(lesson.title);
      figure.innerHTML = '<div class="image-status" role="status">' + escapeHtml(error.message) +
        ' <a href="' + escapeHtml(fallbackUrl) + '" target="_blank" rel="noopener">Commons 자료 검색</a></div>';
    }
  }

  var portals = {
    korean: [["한국사 사료·콘텐츠", "https://www.history.go.kr/"], ["국립중앙박물관", "https://www.museum.go.kr/site/main/home"], ["국가기록원", "https://www.archives.go.kr/"]],
    world: [["유네스코 세계유산", "https://whc.unesco.org/"], ["대영박물관 컬렉션", "https://www.britishmuseum.org/collection"], ["미국 의회도서관", "https://www.loc.gov/collections/"]],
    eastAsia: [["국립중앙박물관", "https://www.museum.go.kr/site/main/home"], ["스미스소니언 아시아 미술관", "https://asia.si.edu/"], ["일본 국립국회도서관", "https://www.ndl.go.jp/en/"]],
    modern: [["유엔", "https://www.un.org/en/"], ["유네스코", "https://www.unesco.org/en"], ["국가기록원", "https://www.archives.go.kr/"]]
  };

  function portalGroup() {
    return course.id === "ea" ? "eastAsia"
      : course.id === "mw" ? "modern"
        : ((course.id === "m1" || course.id === "w") ? "world" : "korean");
  }

  function portalLinks() {
    return portals[portalGroup()].map(function (item) {
      return '<a class="btn" href="' + item[1] + '" target="_blank" rel="noopener">' +
        escapeHtml(item[0]) + "</a>";
    }).join("");
  }

  function establishedUnitResources() {
    if (course.id !== "m2" || unitIndex !== 0) return "";
    return '<section class="card sec"><div class="sec-h"><h2>기존 심화 수업 자료</h2><span class="meta">국가의 형성과 발전 · 9차시</span></div>' +
      '<p>차시별 상세 슬라이드·교사 발문·영상·게임 자료와 시뮬레이션을 별도 자료실에서 이어서 활용할 수 있습니다.</p>' +
      '<div class="actions"><a class="btn primary" href="korea1/index.html">9차시 상세 자료</a>' +
      '<a class="btn" href="korea1/sim.html">한강 쟁탈전 시뮬레이션</a>' +
      '<a class="btn" href="korea1/teacher-kit.html">교사용 설계표</a></div></section>';
  }

  function showError(message) {
    app.className = "wrap";
    app.innerHTML = '<div class="heading"><a href="index.html">← 교육과정 목록</a><h1>자료를 찾을 수 없습니다</h1><p>' +
      escapeHtml(message) + "</p></div>";
  }

  if (!course || !unit) {
    showError("주소의 과목 또는 단원 정보가 올바르지 않습니다. 교육과정 목록에서 단원을 다시 선택해 주세요.");
    return;
  }

  if (params.has("worksheet")) {
    renderWorksheet(Number(params.get("lesson")));
  } else if (params.has("lesson")) {
    renderClass(Number(params.get("lesson")));
  } else {
    renderUnit();
  }

  function renderUnit() {
    document.title = unit.title + " · " + course.name + " · 역사 수업 실험실";
    var lessonItems = unit.lessons.map(function (lesson, index) {
      var href = "class.html?course=" + encodeURIComponent(course.id) + "&unit=" + unitIndex + "&lesson=" + index;
      return '<li><a class="lrow" href="' + href + '"><span class="lnum">' + (index + 1) +
        '</span><span class="ltitle"><b>' + escapeHtml(lesson.title) + '</b><span>' +
        escapeHtml(lesson.standard + " · " + lesson.focus) + '</span></span><span class="lgame"><span>자료 읽기 · 근거 탐구</span></span>' +
        '<span class="lmeta">수업 슬라이드</span><span class="chev">→</span></a></li>';
    }).join("");
    app.className = "";
    app.innerHTML = '<nav class="gnb"><div class="gnb-in"><a class="logo" href="index.html"><i>史</i>역사 수업 실험실</a><span class="sp"></span><a class="btn sm ghost" href="index.html#catalog">교육과정</a></div></nav>' +
      '<main class="page"><section class="hero"><div><div class="kicker"><span class="chip brand">2022 개정 교육과정 기반 재구성</span><span class="chip">' +
      escapeHtml(course.grade + " · " + course.name) + '</span></div><h1><small>단원 수업 자료</small>' +
      escapeHtml(unit.title) + '</h1><p class="lead">' + escapeHtml(unit.overview) +
      '</p></div><div class="facts"><div><b>' + unit.lessons.length + '</b><span>차시 초안</span></div><div><b>1</b><span>핵심 질문</span></div><div><b>1</b><span>탐구 활동지</span></div></div></section>' +
      '<p class="muted">성취기준 범위: ' + escapeHtml(unit.standard) + ' · 각 차시의 세부 성취기준은 차시 제목 옆에 표시됩니다.</p>' +
      '<section class="card sec"><div class="sec-h"><h2>단원 핵심 질문</h2><span class="chip brand">탐구의 출발점</span></div><p class="lead">' +
      escapeHtml(unit.inquiry) + '</p><p class="muted">차시마다 이 질문으로 돌아와 자료의 근거를 바탕으로 답을 다듬습니다.</p></section>' +
      '<section class="card sec"><div class="sec-h"><h2>차시별 자료</h2><span class="meta">질문 · 자료 · 탐구 · 형성 평가</span></div><ol class="lessons">' +
      lessonItems + '</ol></section>' + establishedUnitResources() +
      '<section class="card sec sources"><div class="sec-h"><h2>사료·자료 찾아보기</h2></div><p>' +
      escapeHtml(unit.evidence) + '</p><p class="muted">자료실 링크는 조사 시작점입니다. 수업 전 원자료·출처·저작권·학습 적합성을 확인하세요.</p>' +
      '<div class="actions">' + portalLinks() + '</div></section><footer class="footer">차시 설계 초안은 학교 교육과정·사용 교과서·학습자 수준에 맞게 조정해 주세요.</footer></main>';
  }

  function renderClass(lessonIndex) {
    var lesson = unit.lessons[lessonIndex];
    if (!Number.isInteger(lessonIndex) || !lesson) {
      showError("선택한 차시가 없습니다. 단원 페이지에서 차시를 골라 주세요.");
      return;
    }
    var lessonImage = { pending: true };
    document.title = lesson.title + " · " + course.name + " · 역사 수업 실험실";
    var quizAnswer = (course.id.charCodeAt(0) + unitIndex + lessonIndex) % 4;
    var quizOptions = [
      lesson.core[0],
      "이 내용은 시대·지역·집단의 차이와 관계없이 언제나 똑같이 적용된다.",
      "자료가 하나만 전해지면 다른 기록·유물과 대조하지 않아도 설명을 확정할 수 있다.",
      "현재의 기준만으로 당시 사람들의 조건과 선택을 판단하면 충분하다."
    ];
    var correctOption = quizOptions.shift();
    quizOptions.splice(quizAnswer, 0, correctOption);
    var slides = [
      { cover: true, title: lesson.title, subtitle: unit.title, kicker: course.grade + " · " + course.name, note: "차시 제목과 성취기준을 확인하고, 학생의 선개념을 간단히 듣습니다." },
      { label: "오늘의 학습 목표", title: "오늘, 무엇을 설명할까?", items: [lesson.focus, "핵심 질문에 자료를 근거로 답합니다.", "자료의 맥락과 해석의 범위를 구분합니다."], note: "수업 뒤 학생이 근거를 들어 설명할 수 있는지 확인합니다. 성취기준 코드: " + lesson.standard },
      { label: "생각 열기", title: lesson.inquiry, items: ["현재 알고 있는 내용을 근거와 추측으로 나누어 말합니다.", "답을 확인하려면 어떤 종류의 자료가 필요한지 예상합니다."], answers: ["예상은 잠정적인 가설로 기록하고, 수업에서 확인한 자료와 비교합니다."], note: "정답을 먼저 알려주지 말고 다양한 가설이 나온 이유를 묻습니다." },
      { label: "핵심 내용", title: "「" + lesson.title + "」의 핵심 사실", items: lesson.core, image: lessonImage, note: "제시한 핵심 내용은 수업의 출발점입니다. 교과서와 신뢰할 수 있는 사료·연구 자료를 대조하고 사실과 해석을 구별합니다." },
      { label: "자료로 탐구하기", title: "어떤 자료가 이 설명을 뒷받침할까?", cards: [{ title: "탐구할 자료", body: unit.evidence }, { title: "읽기 과제", body: lesson.evidenceTask + " 오늘의 핵심 내용 중 하나를 선택해 자료의 어느 대목이 근거가 되는지 표시합니다." }], links: portals[portalGroup()], note: "외부 링크는 자료 탐색의 출발점입니다. 원자료의 출처·시기·저작권·이용 조건을 확인하고, 확인되지 않은 문구를 직접 인용하지 않습니다." },
      { label: "탐구 활동", title: lesson.activity.split(" — ")[0], callout: lesson.activity.split(" — ")[1].split(" 주제 적용: ")[0], items: ["「" + lesson.title + "」 관련 자료 두 개의 출처·시기를 기록합니다.", "핵심 사실을 뒷받침하는 근거와 그 한계를 설명합니다."], timer: 10, note: "활동 결과물에서 자료와 주장의 연결, 반대 근거에 대한 검토, 출처 표기를 살펴봅니다." },
      { label: "확인 문제", title: lesson.title + "에 관한 설명", quiz: { question: "오늘의 핵심 내용에 근거한 설명으로 가장 타당한 것은 무엇일까요?", options: quizOptions, answer: quizAnswer, explanation: "이 수업의 핵심 사실에 해당합니다. 자료의 작성 맥락과 다른 증거를 확인하며 주장의 범위를 정하세요." }, note: "핵심 사실의 의미를 학생 자신의 말로 설명하게 하고, 다른 보기를 선택할 수 없는 이유를 근거로 말하게 합니다." },
      { label: "생각 질문", title: "오늘의 사실을 근거로 설명하기", items: lesson.core, question: lesson.inquiry, note: "두 핵심 사실 중 질문에 직접 답하는 내용을 고르고, 자료만으로 알 수 없는 점도 덧붙이도록 안내합니다." },
      { label: "오늘 배운 내용 정리", title: "주장 · 근거 · 맥락", items: ["핵심 사실: " + lesson.core[0], "비교할 내용: " + lesson.core[1], "근거를 선택할 때 자료의 시기·작성 목적·대상을 확인합니다."], note: "학생의 설명을 처음 가설과 비교하고, 새 근거로 수정한 부분을 짚습니다." },
      { label: "나가기 전 한 문제", title: "한 문장 역사 설명", question: lesson.exitQuestion, items: ["답에 성취기준의 핵심 개념이 반영되었는가?", "주장과 구체적인 자료 근거가 연결되는가?"], note: "출구 티켓으로 수업 목표 도달 여부를 확인하고 다음 차시의 보충 설명을 결정합니다." }
    ];
    var current = Math.max(0, Math.min(slides.length - 1, (Number(location.hash.slice(1)) || 1) - 1));
    var revealed = [];
    var showNotes = false;
    var area = course.id === "m1" ? "gj" : course.id === "m2" ? "gg" : course.id === "ea" ? "gy" : course.id === "mw" ? "hist" : "bj";
    document.body.dataset.area = area;
    app.className = "";
    app.innerHTML = '<div class="viewport"><div class="stage" id="stage"></div></div><div class="prog" id="progress"></div>' +
      '<div class="notes" id="notes"></div><nav class="bar" aria-label="수업 슬라이드 조작">' +
      '<button id="prev" type="button">←</button><span class="ttl">' + escapeHtml((lessonIndex + 1) + "차시 · " + lesson.title) +
      '</span><span class="pg" id="count"></span><button id="next" type="button">→</button>' +
      '<span class="hint">N 교사 메모 · F 전체 화면</span><button id="notes-toggle" type="button">N</button><button id="fullscreen" type="button">F</button>' +
      '<div class="deck-links"><a href="unit.html?course=' + encodeURIComponent(course.id) + '&unit=' + unitIndex + '">단원</a>' +
      '<a href="worksheet.html?course=' + encodeURIComponent(course.id) + '&unit=' + unitIndex + '&lesson=' + lessonIndex + '&worksheet=1">활동지</a>' +
      '<a href="' + (lessonIndex + 1 < unit.lessons.length ? "class.html?course=" + encodeURIComponent(course.id) + "&unit=" + unitIndex + "&lesson=" + (lessonIndex + 1) : "unit.html?course=" + encodeURIComponent(course.id) + "&unit=" + unitIndex) + '">다음 →</a></div></nav>';

    var stage = document.getElementById("stage");
    var notes = document.getElementById("notes");
    function renderBlock(item) {
      var html = "";
      if (item.items) {
        html += "<ul>" + item.items.map(function (text, index) {
          return '<li class="frag" data-frag="' + index + '">' + escapeHtml(text) + "</li>";
        }).join("") + "</ul>";
      }
      if (item.image) html += imageFigure(item.image, "lesson-image", item.title);
      if (item.answers) {
        html += '<div class="qa">' + item.answers.map(function (text, index) {
          return '<div class="a frag" data-frag="' + (item.items.length + index) + '">' + escapeHtml(text) + "</div>";
        }).join("") + "</div>";
      }
      if (item.cards) {
        html += '<div class="cards">' + item.cards.map(function (card, index) {
          return '<article class="card frag" data-frag="' + index + '"><h3>' +
            escapeHtml(card.title) + '</h3><p>' + escapeHtml(card.body) + "</p></article>";
        }).join("") + "</div>";
      }
      if (item.links) {
        html += '<div class="source-links">' + item.links.map(function (link) {
          return '<a href="' + escapeHtml(link[1]) + '" target="_blank" rel="noopener">' +
            escapeHtml(link[0]) + ' ↗</a>';
        }).join("") + "</div>";
      }
      if (item.callout) html += '<div class="call frag" data-frag="0">' + escapeHtml(item.callout) + "</div>";
      if (item.question) html += '<div class="qa"><div class="q">' + escapeHtml(item.question) + "</div></div>";
      if (item.timer) html += '<button class="timer" type="button" data-minutes="' + item.timer + '">▶ ' +
        item.timer + '분 활동 시작</button><span class="timer-readout" aria-live="polite"></span>';
      if (item.quiz) {
        html += '<div class="quiz"><p>' + escapeHtml(item.quiz.question) + '</p><div class="quiz-options">' +
          item.quiz.options.map(function (option, index) {
            return '<button type="button" class="quiz-option" data-answer="' + index +
              '" data-correct="' + item.quiz.answer + '">' + escapeHtml(option) + '</button>';
          }).join("") + '</div><p class="quiz-result" aria-live="polite"></p><p class="quiz-explanation" hidden>' +
          escapeHtml(item.quiz.explanation) + "</p></div>";
      }
      if (item.cover) {
        return '<section class="slide cover"><span class="kick">' + escapeHtml(item.kicker) +
          '</span><h1>' + escapeHtml(item.title) + '</h1><div class="sub">' + escapeHtml(item.subtitle) +
          '</div><div class="meta">' + escapeHtml(course.name + " · " + unit.title + " · 2022 개정 교육과정") + '</div><div class="no"></div></section>';
      }
      return '<section class="slide"><h2 class="t"><small>' + escapeHtml(item.label) + '</small>' +
        escapeHtml(item.title) + '</h2><div class="body">' + html + '</div><div class="crumb">' +
        escapeHtml(course.name + " · " + unit.title) + '</div><div class="no"></div></section>';
    }
    stage.innerHTML = slides.map(renderBlock).join("");
    var slideImage = stage.querySelector(".lesson-image");
    if (slideImage) resolveLessonImage(lesson, slideImage);
    var slideElements = Array.prototype.slice.call(stage.querySelectorAll(".slide"));

    function scaleStage() {
      var scale = Math.min(window.innerWidth / 1600, Math.max(240, window.innerHeight - 52) / 900);
      stage.style.transform = "translate(-50%,-50%) scale(" + scale + ")";
    }
    function displaySlide() {
      slideElements.forEach(function (element, index) {
        element.classList.toggle("on", current === index);
        element.querySelector(".no").textContent = String(index + 1);
      });
      revealed.forEach(function (element) { element.classList.add("shown"); });
      document.getElementById("count").textContent = (current + 1) + " / " + slides.length;
      document.getElementById("progress").style.width = ((current + 1) / slides.length * 100) + "%";
      notes.textContent = slides[current].note;
      notes.classList.toggle("on", showNotes);
      history.replaceState(null, "", "#" + (current + 1));
      scaleStage();
    }
    function next() {
      var remaining = Array.prototype.slice.call(slideElements[current].querySelectorAll(".frag:not(.shown)"));
      if (remaining.length) {
        revealed.push(remaining[0]);
        remaining[0].classList.add("shown");
      } else if (current < slides.length - 1) {
        current += 1;
        revealed = [];
        displaySlide();
      }
    }
    function previous() {
      if (revealed.length) revealed.pop().classList.remove("shown");
      else if (current > 0) {
        current -= 1;
        revealed = Array.prototype.slice.call(slideElements[current].querySelectorAll(".frag"));
        displaySlide();
      }
    }
    document.getElementById("next").addEventListener("click", next);
    document.getElementById("prev").addEventListener("click", previous);
    document.getElementById("notes-toggle").addEventListener("click", function () {
      showNotes = !showNotes;
      displaySlide();
    });
    document.getElementById("fullscreen").addEventListener("click", function () {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function (error) {
          notes.textContent = "전체 화면을 시작할 수 없습니다: " + error.message;
          notes.classList.add("on");
        });
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      } else {
        notes.textContent = "이 브라우저에서는 전체 화면을 사용할 수 없습니다.";
        notes.classList.add("on");
      }
    });
    stage.addEventListener("click", function (event) {
      var option = event.target.closest(".quiz-option");
      if (option) {
        var correct = option.dataset.answer === option.dataset.correct;
        var quiz = option.closest(".quiz");
        quiz.querySelector(".quiz-result").textContent = correct ? "정답입니다." : "다시 생각해 보세요.";
        quiz.querySelector(".quiz-explanation").hidden = !correct;
        return;
      }
      var timerButton = event.target.closest(".timer");
      if (timerButton) {
        var readout = timerButton.nextElementSibling;
        var endAt = Date.now() + Number(timerButton.dataset.minutes) * 60000;
        timerButton.disabled = true;
        function tick() {
          var seconds = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
          readout.textContent = seconds ? Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0") : "활동 시간이 끝났습니다.";
          if (seconds) window.setTimeout(tick, 1000);
          else timerButton.disabled = false;
        }
        tick();
        return;
      }
      if (event.target.closest("a, button")) return;
      if (event.clientX < window.innerWidth * 0.25) previous();
      else next();
    });
    document.addEventListener("keydown", function (event) {
      if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
      if (["ArrowRight", " ", "PageDown", "Enter"].indexOf(event.key) !== -1) {
        event.preventDefault();
        next();
      } else if (["ArrowLeft", "PageUp", "Backspace"].indexOf(event.key) !== -1) {
        event.preventDefault();
        previous();
      } else if (event.key.toLowerCase() === "n") {
        showNotes = !showNotes;
        displaySlide();
      } else if (event.key.toLowerCase() === "f") {
        document.getElementById("fullscreen").click();
      }
    });
    window.addEventListener("resize", scaleStage);
    displaySlide();
  }

  function renderWorksheet(lessonIndex) {
    var lesson = unit.lessons[lessonIndex];
    if (!Number.isInteger(lessonIndex) || !lesson) {
      showError("활동지의 차시 정보가 올바르지 않습니다.");
      return;
    }
    var lessonImage = { pending: true };
    document.title = lesson.title + " 활동지 · " + course.name;
    app.className = "wrap";
    app.innerHTML = '<nav class="top no-print"><a href="index.html">역사 수업 실험실</a><a href="unit.html?course=' +
      encodeURIComponent(course.id) + '&unit=' + unitIndex + '">단원 자료</a><button class="btn primary" type="button" onclick="print()">인쇄하기</button></nav>' +
      '<header class="heading"><div class="eyebrow">' + escapeHtml(course.grade + " · " + course.name + " · " + unit.title) +
      '</div><h1>' + escapeHtml((lessonIndex + 1) + "차시 · " + lesson.title) +
      '</h1><p>' + escapeHtml(lesson.focus) + '</p></header>' + imageFigure(lessonImage, "worksheet-image", lesson.title) +
      '<section class="card worksheet"><h2>탐구 질문</h2><p>' + escapeHtml(lesson.inquiry) +
      '</p><p><b>성취기준:</b> ' + escapeHtml(lesson.standard) + '</p><p><b>활동:</b> ' + escapeHtml(lesson.activity) + '</p><div class="grid">' +
      '<div class="field"><b>핵심 내용 1</b><p>' + escapeHtml(lesson.core[0]) + '</p></div>' +
      '<div class="field"><b>핵심 내용 2</b><p>' + escapeHtml(lesson.core[1]) + '</p></div></div>' +
      '<h2>사료 분석</h2><p>' + escapeHtml(lesson.evidenceTask) + '</p><div class="grid">' +
      '<div class="field"><b>1. 자료에서 직접 확인한 사실과 쪽수·주소</b><div class="blank"></div></div>' +
      '<div class="field"><b>2. 자료의 작성자·시기·목적·대상</b><div class="blank"></div></div>' +
      '<div class="field"><b>3. 탐구 질문에 답하는 핵심 근거</b><div class="blank"></div></div>' +
      '<div class="field"><b>4. 근거를 연결한 나의 설명</b><div class="blank"></div></div></div>' +
      '<div class="field" style="margin-top:12px"><b>5. 반대 자료나 추가 조사로 확인할 점</b><div class="blank"></div></div>' +
      '<div class="field" style="margin-top:12px"><b>6. 출구 티켓 — ' + escapeHtml(lesson.exitQuestion) + '</b><div class="blank"></div></div>' +
      '<section class="sources"><h2>자료 선택 안내</h2><p>' + escapeHtml(unit.evidence) +
      '</p><p class="muted">교사와 함께 원자료의 출처·시기·이용 조건을 확인하세요. 아래 기관은 자료 탐색의 출발점이며 특정 자료의 존재나 수업 적합성을 보증하지 않습니다.</p>' +
      '<div class="actions">' + portalLinks() + '</div></section>' +
      '<details class="no-print"><summary>교사용 점검 기준</summary><p>주장과 자료가 연결되는지, 자료의 맥락을 고려하는지, 확인되지 않은 내용을 사실처럼 쓰지 않는지 평가합니다.</p></details></section>';
    var worksheetImage = app.querySelector(".worksheet-image");
    if (worksheetImage) resolveLessonImage(lesson, worksheetImage);
  }
})();

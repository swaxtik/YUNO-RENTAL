// ========== CONFIG ==========
const WHATSAPP_NUMBER = "918951849454"; // +91 89518 49454

// ========== UTIL ==========

function setYear() {
  const span = document.getElementById("yearSpan");
  if (span) span.textContent = new Date().getFullYear();
}

function setupDateLimits() {
  const pickupInput = document.getElementById("pickupDate");
  const returnInput = document.getElementById("returnDate");
  if (!pickupInput || !returnInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  pickupInput.min = todayStr;
  returnInput.min = todayStr;

  pickupInput.addEventListener("change", () => {
    if (pickupInput.value) {
      returnInput.min = pickupInput.value;
    } else {
      returnInput.min = todayStr;
    }
    updateRentalSummary();
  });

  returnInput.addEventListener("change", updateRentalSummary);
}

// Convert "HH:MM" (24h) to "hh:MM AM/PM"
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  let hour = parseInt(parts[0], 10);
  const minute = parts[1];
  if (Number.isNaN(hour)) return timeStr;

  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${String(hour).padStart(2, "0")}:${minute} ${suffix}`;
}

// Convert "YYYY-MM-DD" to "DD Mon YYYY"
function formatDateHuman(ymd) {
  if (!ymd || typeof ymd !== "string") return ymd || "";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;

  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (Number.isNaN(date.getTime())) return ymd;

  const day = String(date.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul",
    "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

// Calculate rental days (inclusive)
function calculateRentalDays(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) return null;

  const pickup = new Date(pickupDate);
  const ret = new Date(returnDate);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) return null;
  if (ret < pickup) return null;

  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.round((ret - pickup) / msPerDay) + 1; // inclusive
  return diff;
}

// Optional on-page summary (requires <div id="rentalSummary"></div> in HTML)
function updateRentalSummary() {
  const pickupInput = document.getElementById("pickupDate");
  const returnInput = document.getElementById("returnDate");
  const pickupTimeInput = document.getElementById("pickupTime");
  const returnTimeInput = document.getElementById("returnTime");
  const summaryEl = document.getElementById("rentalSummary");

  if (!pickupInput || !returnInput || !summaryEl) return;

  const pickupDate = pickupInput.value;
  const returnDate = returnInput.value;
  if (!pickupDate || !returnDate) {
    summaryEl.textContent = "";
    summaryEl.classList.remove("has-summary");
    return;
  }

  const days = calculateRentalDays(pickupDate, returnDate);
  if (!days) {
    summaryEl.textContent = "";
    summaryEl.classList.remove("has-summary");
    return;
  }

  const pickupTimeFormatted = pickupTimeInput
    ? formatTime12h(pickupTimeInput.value)
    : "";
  const returnTimeFormatted = returnTimeInput
    ? formatTime12h(returnTimeInput.value)
    : "";

  const pickupStr =
    `${formatDateHuman(pickupDate)}` +
    (pickupTimeFormatted ? ` at ${pickupTimeFormatted}` : "");
  const returnStr =
    `${formatDateHuman(returnDate)}` +
    (returnTimeFormatted ? ` at ${returnTimeFormatted}` : "");

  summaryEl.textContent =
    `Rental duration: ${days} day${days > 1 ? "s" : ""} ` +
    `(${pickupStr} → ${returnStr})`;
  summaryEl.classList.add("has-summary");
}

// ========== FLEET SLIDER & FILTERS ==========

let allCards = [];
let currentIndex = 0;
let currentFilter = "all";
let sliderKeyboardBound = false;

function initFleet() {
  const slider = document.getElementById("vehicleSlider");
  if (!slider) return;

  allCards = Array.from(slider.querySelectorAll(".vehicle-card"));
  if (allCards.length === 0) return;

  setupFilterButtons();
  applyFilter(currentFilter);
  updateSliderClasses();
  buildDots();
  attachCardButtons();
  setupSliderKeyboard();
}

function getVisibleCards() {
  return allCards.filter(
    (card) => !card.classList.contains("is-filter-hidden")
  );
}

function applyFilter(type) {
  currentFilter = type;
  const emptyEl = document.getElementById("fleetEmpty");

  allCards.forEach((card) => {
    const cardType = card.getAttribute("data-type");
    if (type === "all" || cardType === type) {
      card.classList.remove("is-filter-hidden");
    } else {
      card.classList.add("is-filter-hidden");
    }
  });

  const visible = getVisibleCards();
  if (visible.length === 0) {
    if (emptyEl) emptyEl.classList.add("is-visible");
  } else if (emptyEl) {
    emptyEl.classList.remove("is-visible");
  }

  currentIndex = 0;
  updateSliderClasses();
  updateDots();
}

function updateSliderClasses() {
  const visible = getVisibleCards();
  if (visible.length === 0) return;

  if (currentIndex < 0) currentIndex = visible.length - 1;
  if (currentIndex >= visible.length) currentIndex = 0;

  allCards.forEach((card) => {
    card.classList.remove("is-active", "is-left", "is-right", "is-hidden");
  });

  const activeCard = visible[currentIndex];
  activeCard.classList.add("is-active");

  const leftIndex = (currentIndex - 1 + visible.length) % visible.length;
  const rightIndex = (currentIndex + 1) % visible.length;

  if (visible.length > 1) {
    visible[leftIndex].classList.add("is-left");
    visible[rightIndex].classList.add("is-right");
  }

  visible.forEach((card, i) => {
    if (i !== currentIndex && i !== leftIndex && i !== rightIndex) {
      card.classList.add("is-hidden");
    }
  });

  const activeId = activeCard.getAttribute("data-id");
  const select = document.getElementById("vehicleSelect");
  if (select && activeId && !select.dataset.userTouched) {
    const hasOption = Array.from(select.options).some(
      (opt) => opt.value === activeId
    );
    if (hasOption) {
      select.value = activeId;
    }
  }

  updateDots();
}

function sliderNext() {
  const visible = getVisibleCards();
  if (visible.length === 0) return;
  currentIndex = (currentIndex + 1) % visible.length;
  updateSliderClasses();
}

function sliderPrev() {
  const visible = getVisibleCards();
  if (visible.length === 0) return;
  currentIndex = (currentIndex - 1 + visible.length) % visible.length;
  updateSliderClasses();
}

function buildDots() {
  const dotsContainer = document.getElementById("sliderDots");
  if (!dotsContainer) return;
  dotsContainer.innerHTML = "";

  const visible = getVisibleCards();
  visible.forEach((_card, idx) => {
    const dot = document.createElement("span");
    dot.className = "slider-dot" + (idx === currentIndex ? " is-active" : "");
    dot.dataset.index = String(idx);
    dot.addEventListener("click", () => {
      currentIndex = idx;
      updateSliderClasses();
    });
    dotsContainer.appendChild(dot);
  });
}

function updateDots() {
  const dotsContainer = document.getElementById("sliderDots");
  if (!dotsContainer) return;

  const visible = getVisibleCards();
  const dots = Array.from(dotsContainer.querySelectorAll(".slider-dot"));

  if (dots.length !== visible.length) {
    buildDots();
    return;
  }

  dots.forEach((dot, idx) => {
    dot.classList.toggle("is-active", idx === currentIndex);
  });
}

function setupFilterButtons() {
  const group = document.getElementById("typeFilterGroup");
  if (!group) return;

  const pills = group.querySelectorAll(".filter-pill");
  pills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const type = pill.getAttribute("data-filter") || "all";
      currentFilter = type;

      pills.forEach((p) => {
        p.classList.toggle("is-active", p === pill);
      });

      applyFilter(currentFilter);
      buildDots();
    });
  });
}

function attachCardButtons() {
  allCards.forEach((card) => {
    const bookBtn = card.querySelector(".js-book-from-card");
    const id = card.getAttribute("data-id");
    const available = card.getAttribute("data-available") !== "false";

    if (bookBtn && available && !bookBtn.disabled) {
      bookBtn.addEventListener("click", () => {
        const visible = getVisibleCards();
        const idx = visible.indexOf(card);
        if (idx !== -1) {
          currentIndex = idx;
          updateSliderClasses();
        }

        const bookingSection = document.getElementById("booking");
        const select = document.getElementById("vehicleSelect");
        if (select && id) {
          select.value = id;
          select.dataset.userTouched = "1";
        }
        if (bookingSection) {
          bookingSection.scrollIntoView({ behavior: "smooth" });
        }
      });
    }
  });
}

function setupSliderKeyboard() {
  if (sliderKeyboardBound || !allCards.length) return;
  sliderKeyboardBound = true;

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight") {
      sliderNext();
    } else if (event.key === "ArrowLeft") {
      sliderPrev();
    }
  });
}

// ========== POPULATE VEHICLE SELECT FROM CARDS ==========

function fillVehicleSelect() {
  const select = document.getElementById("vehicleSelect");
  if (!select) return;
  const slider = document.getElementById("vehicleSlider");
  if (!slider) return;

  const cards = slider.querySelectorAll(".vehicle-card");
  select.innerHTML = '<option value="">Select vehicle</option>';

  cards.forEach((card) => {
    const id = card.getAttribute("data-id");
    const type = card.getAttribute("data-type");
    const available = card.getAttribute("data-available") !== "false";
    const nameEl = card.querySelector(".vehicle-name");
    if (!id || !nameEl || !available) return;

    const typeLabel = type === "bike" ? "Bike" : "Scooty";
    const option = document.createElement("option");
    option.value = id;
    option.textContent = `${nameEl.textContent.trim()} (${typeLabel})`;
    select.appendChild(option);
  });

  select.addEventListener("change", () => {
    select.dataset.userTouched = "1";
  });
}

// ========== BOOKING FORM / WHATSAPP ==========

function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  const messageEl = document.getElementById("bookingMessage");
  if (!form || !messageEl) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "form-message";

    const formData = new FormData(form);

    const pickupDate = formData.get("pickupDate");
    const returnDate = formData.get("returnDate");

    if (!pickupDate || !returnDate) {
      messageEl.textContent = "Please select both pickup and return dates.";
      messageEl.classList.add("error");
      return;
    }

    const pickup = new Date(pickupDate);
    const ret = new Date(returnDate);

    if (Number.isNaN(pickup.getTime()) || Number.isNaN(ret.getTime())) {
      messageEl.textContent = "Invalid date selection. Please choose again.";
      messageEl.classList.add("error");
      return;
    }

    if (ret < pickup) {
      messageEl.textContent =
        "Return date cannot be earlier than pickup date.";
      messageEl.classList.add("error");
      return;
    }

    const rentalDays = calculateRentalDays(pickupDate, returnDate);
    if (!rentalDays) {
      messageEl.textContent =
        "Unable to calculate rental duration. Please check dates.";
      messageEl.classList.add("error");
      return;
    }

    const vehicleId = formData.get("vehicle");
    if (!vehicleId) {
      messageEl.textContent = "Please select a vehicle.";
      messageEl.classList.add("error");
      return;
    }

    const card = allCards.find(
      (c) => c.getAttribute("data-id") === vehicleId
    );
    if (!card) {
      messageEl.textContent = "Selected vehicle not found. Please try again.";
      messageEl.classList.add("error");
      return;
    }

    const nameEl = card.querySelector(".vehicle-name");
    const subtitleEl = card.querySelector(".vehicle-subtitle");
    const descEl = card.querySelector(".vehicle-desc");

    const vehicleName = nameEl ? nameEl.textContent.trim() : vehicleId;
    const subtitle = subtitleEl ? subtitleEl.textContent.trim() : "";
    const desc = descEl ? descEl.textContent.trim() : "";

    const pickupTimeRaw = formData.get("pickupTime") || "";
    const returnTimeRaw = formData.get("returnTime") || "";

    const pickupTimeFormatted = formatTime12h(pickupTimeRaw);
    const returnTimeFormatted = formatTime12h(returnTimeRaw);

    const pickupDisplay =
      `${formatDateHuman(pickupDate)}` +
      (pickupTimeFormatted ? ` at ${pickupTimeFormatted}` : "");
    const returnDisplay =
      `${formatDateHuman(returnDate)}` +
      (returnTimeFormatted ? ` at ${returnTimeFormatted}` : "");

    const msgLines = [
      "New rental request – YUNO RIDE Rentals",
      "--------------------------------------",
      `Name: ${formData.get("fullName") || "-"}`,
      `Phone: ${formData.get("phone") || "-"}`,
      "",
      `Vehicle: ${vehicleName}`,
      subtitle ? `Details: ${subtitle}` : "",
      desc ? `Description: ${desc}` : "",
      "",
      `Pickup: ${pickupDisplay}`,
      `Return (estimated): ${returnDisplay}`,
      `Rental duration: ${rentalDays} day${rentalDays > 1 ? "s" : ""}`,
      "",
      `Extra notes: ${formData.get("notes") || "-"}`,
      "",
      "Rider confirms a valid license and acceptance of rental terms."
    ].filter(Boolean);

    const waText = encodeURIComponent(msgLines.join("\n"));
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`;
    window.open(waUrl, "_blank");

    messageEl.textContent =
      "WhatsApp opened with your booking details. Please review and send to confirm.";
    messageEl.classList.add("success");
  });
}

// ========== HEADER SCROLL EFFECT ==========

function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 12) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  };

  onScroll();
  window.addEventListener("scroll", onScroll);
}

// ========== SCROLL REVEAL ==========

function setupRevealOnScroll() {
  let elements = document.querySelectorAll(".reveal");

  // If no explicit .reveal elements, apply to hero + sections by default
  if (!elements.length) {
    document
      .querySelectorAll(".hero, .section, .hero-banner")
      .forEach((el) => el.classList.add("reveal"));
    elements = document.querySelectorAll(".reveal");
  }

  if (!("IntersectionObserver" in window) || !elements.length) return;

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elements.forEach((el) => observer.observe(el));
}

// ========== INIT ==========

document.addEventListener("DOMContentLoaded", () => {
  setYear();
  setupDateLimits();
  initFleet();
  fillVehicleSelect();
  setupBookingForm();
  setupHeaderScroll();
  setupRevealOnScroll();

  // Initial summary update if dates prefilled
  updateRentalSummary();

  const prevBtn = document.getElementById("sliderPrev");
  const nextBtn = document.getElementById("sliderNext");
  if (prevBtn) prevBtn.addEventListener("click", sliderPrev);
  if (nextBtn) nextBtn.addEventListener("click", sliderNext);

  const pickupTimeInput = document.getElementById("pickupTime");
  const returnTimeInput = document.getElementById("returnTime");
  if (pickupTimeInput) pickupTimeInput.addEventListener("change", updateRentalSummary);
  if (returnTimeInput) returnTimeInput.addEventListener("change", updateRentalSummary);
});

// ========== FUNCTIONS ==========

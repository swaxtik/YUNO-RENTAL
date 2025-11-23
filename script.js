// ========== CONFIG ==========
const WHATSAPP_NUMBER = "918951849454"; // +91 89518 49454

// ========== UTIL ==========

function setYear() {
  const span = document.getElementById("yearSpan");
  if (span) span.textContent = new Date().getFullYear();
}

// Auto-limit dates + auto-set return time = +24 hrs
function setupDateLimits() {
  const pickupInput = document.getElementById("pickupDate");
  const returnInput = document.getElementById("returnDate");
  const pickupTimeInput = document.getElementById("pickupTime");
  const returnTimeInput = document.getElementById("returnTime");

  if (!pickupInput || !returnInput) return;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  pickupInput.min = todayStr;
  returnInput.min = todayStr;

  // MAIN LOGIC: Auto-return = pickup + 24 hrs
  function updateAutoReturn() {
    if (!pickupInput.value) return;

    const pDate = pickupInput.value;
    const pTime = pickupTimeInput?.value || "10:00";

    const [h, m] = pTime.split(":").map(Number);

    const start = new Date(pDate);
    start.setHours(h, m, 0);

    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    const yyyy = end.getFullYear();
    const mm = String(end.getMonth() + 1).padStart(2, "0");
    const dd = String(end.getDate()).padStart(2, "0");

    returnInput.value = `${yyyy}-${mm}-${dd}`;

    const hh = String(end.getHours()).padStart(2, "0");
    const min = String(end.getMinutes()).padStart(2, "0");

    if (returnTimeInput) returnTimeInput.value = `${hh}:${min}`;

    updateRentalSummary();
  }

  pickupInput.addEventListener("change", updateAutoReturn);
  pickupTimeInput?.addEventListener("change", updateAutoReturn);
  returnInput.addEventListener("change", updateRentalSummary);
  returnTimeInput?.addEventListener("change", updateRentalSummary);
}

// Format "HH:MM" to "12h AM/PM"
function formatTime12h(timeStr) {
  if (!timeStr) return "";
  let [hour, minute] = timeStr.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

// Format "YYYY-MM-DD" to "DD Mon YYYY"
function formatDateHuman(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d).padStart(2, "0")} ${monthNames[date.getMonth()]} ${y}`;
}

function formatINR(amount) {
  if (!amount) return "";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

// Rental days inclusive
function calculateRentalDays(pickupDate, returnDate) {
  if (!pickupDate || !returnDate) return null;
  const p = new Date(pickupDate);
  const r = new Date(returnDate);
  if (r < p) return null;

  const diff = Math.round((r - p) / (24 * 60 * 60 * 1000)) + 1;
  return diff;
}

// On-page rental summary
function updateRentalSummary() {
  const pickupInput = document.getElementById("pickupDate");
  const returnInput = document.getElementById("returnDate");
  const pickupTimeInput = document.getElementById("pickupTime");
  const returnTimeInput = document.getElementById("returnTime");
  const summaryEl = document.getElementById("rentalSummary");

  if (!pickupInput || !returnInput || !summaryEl) return;

  const pickup = pickupInput.value;
  const ret = returnInput.value;
  if (!pickup || !ret) {
    summaryEl.textContent = "";
    return;
  }

  const days = calculateRentalDays(pickup, ret);
  if (!days) return;

  const pickupStr = `${formatDateHuman(pickup)} at ${formatTime12h(pickupTimeInput.value)}`;
  const returnStr = `${formatDateHuman(ret)} at ${formatTime12h(returnTimeInput.value)}`;

  summaryEl.textContent =
    `Rental: ${days} day${days > 1 ? "s" : ""} (${pickupStr} → ${returnStr}) • Late return may incur extra charges.`;
}

// ========== FLEET SLIDER ELEMENTS ==========
let allCards = [];
let currentIndex = 0;
let currentFilter = "all";

// (Slider functions unchanged — keeping your logic intact)
function initFleet() {
  const slider = document.getElementById("vehicleSlider");
  if (!slider) return;
  allCards = Array.from(slider.querySelectorAll(".vehicle-card"));
  setupFilterButtons();
  applyFilter(currentFilter);
  updateSliderClasses();
  buildDots();
  attachCardButtons();
  setupSliderKeyboard();
}

function getVisibleCards() {
  return allCards.filter(c => !c.classList.contains("is-filter-hidden"));
}

function applyFilter(type) {
  currentFilter = type;
  const emptyEl = document.getElementById("fleetEmpty");

  allCards.forEach(card => {
    const cardType = card.getAttribute("data-type");
    card.classList.toggle("is-filter-hidden", !(type === "all" || cardType === type));
  });

  const visible = getVisibleCards();
  emptyEl?.classList.toggle("is-visible", visible.length === 0);

  currentIndex = 0;
  updateSliderClasses();
  updateDots();
}

function updateSliderClasses() {
  const visible = getVisibleCards();
  if (!visible.length) return;

  currentIndex = (currentIndex + visible.length) % visible.length;

  allCards.forEach(c => c.classList.remove("is-active", "is-left", "is-right", "is-hidden"));

  const active = visible[currentIndex];
  active.classList.add("is-active");

  const left = visible[(currentIndex - 1 + visible.length) % visible.length];
  const right = visible[(currentIndex + 1) % visible.length];

  left?.classList.add("is-left");
  right?.classList.add("is-right");

  visible.forEach((c, i) => {
    if (i !== currentIndex && c !== left && c !== right) c.classList.add("is-hidden");
  });

  updateDots();
}

const sliderNext = () => { currentIndex++; updateSliderClasses(); };
const sliderPrev = () => { currentIndex--; updateSliderClasses(); };

function buildDots() {
  const dots = document.getElementById("sliderDots");
  if (!dots) return;
  dots.innerHTML = "";

  getVisibleCards().forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "slider-dot" + (i === currentIndex ? " is-active" : "");
    dot.onclick = () => { currentIndex = i; updateSliderClasses(); };
    dots.appendChild(dot);
  });
}

function updateDots() {
  const dots = document.getElementById("sliderDots");
  if (!dots) return;
  const visible = getVisibleCards();
  const all = dots.querySelectorAll(".slider-dot");
  if (all.length !== visible.length) return buildDots();

  all.forEach((d, i) => d.classList.toggle("is-active", i === currentIndex));
}

function setupFilterButtons() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(p => {
    p.onclick = () => {
      pills.forEach(x => x.classList.remove("is-active"));
      p.classList.add("is-active");
      applyFilter(p.dataset.filter);
    };
  });
}

function attachCardButtons() {
  allCards.forEach(card => {
    const btn = card.querySelector(".js-book-from-card");
    if (!btn) return;
    btn.onclick = () => {
      currentIndex = getVisibleCards().indexOf(card);
      updateSliderClasses();
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
      document.getElementById("vehicleSelect").value = card.dataset.id;
    };
  });
}

function setupSliderKeyboard() {
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") sliderNext();
    if (e.key === "ArrowLeft") sliderPrev();
  });
}

// Populate dropdown from cards
function fillVehicleSelect() {
  const select = document.getElementById("vehicleSelect");
  if (!select) return;

  const slider = document.getElementById("vehicleSlider");
  const cards = slider.querySelectorAll(".vehicle-card");
  select.innerHTML = '<option value="">Select vehicle</option>';

  cards.forEach(card => {
    if (card.getAttribute("data-available") === "false") return;

    const id = card.getAttribute("data-id");
    const name = card.querySelector(".vehicle-name")?.textContent.trim();
    const typeLabel = card.getAttribute("data-type") === "bike" ? "Bike" : "Scooty";

    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `${name} (${typeLabel})`;
    select.appendChild(opt);
  });
}

// ========== BOOKING FORM / WHATSAPP ==========

function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  const messageEl = document.getElementById("bookingMessage");

  form.addEventListener("submit", e => {
    e.preventDefault();
    messageEl.textContent = "";
    messageEl.className = "form-message";

    const fd = new FormData(form);
    const pickupDate = fd.get("pickupDate");
    const returnDate = fd.get("returnDate");

    if (!pickupDate || !returnDate) {
      messageEl.textContent = "Please select both pickup and return dates.";
      messageEl.classList.add("error");
      return;
    }

    const rentalDays = calculateRentalDays(pickupDate, returnDate);
    if (!rentalDays) {
      messageEl.textContent = "Invalid rental duration.";
      messageEl.classList.add("error");
      return;
    }

    const vehicleId = fd.get("vehicle");
    const card = allCards.find(c => c.dataset.id === vehicleId);
    if (!card) {
      messageEl.textContent = "Vehicle not found.";
      messageEl.classList.add("error");
      return;
    }

    const vehicleName = card.querySelector(".vehicle-name").textContent.trim();
    const subtitle = card.querySelector(".vehicle-subtitle")?.textContent || "";
    const desc = card.querySelector(".vehicle-desc")?.textContent || "";

    const dailyRate = Number(card.getAttribute("data-day"));
    const weeklyRate = Number(card.getAttribute("data-week"));

    let estimatedTotal = rentalDays * dailyRate;
    if (rentalDays >= 7 && weeklyRate) {
      const weeks = Math.floor(rentalDays / 7);
      const remaining = rentalDays % 7;
      estimatedTotal = weeks * weeklyRate + remaining * dailyRate;
    }

    const pickupTime = formatTime12h(fd.get("pickupTime"));
    const returnTime = formatTime12h(fd.get("returnTime"));

    const pickupDisplay = `${formatDateHuman(pickupDate)} at ${pickupTime}`;
    const returnDisplay = `${formatDateHuman(returnDate)} at ${returnTime}`;

    const rateLine = `Rate: ${formatINR(dailyRate)} per day ${weeklyRate ? "• " + formatINR(weeklyRate) + " per week" : ""}`;
    const totalLine = `Estimated total: ${formatINR(estimatedTotal)} for ${rentalDays} day${rentalDays > 1 ? "s" : ""}`;

    // 💎 CLEAN & NEAT WHATSAPP MESSAGE
    const msgLines = [
      "YUNO RIDE – NEW BOOKING REQUEST",
      "================================",
      "",
      "1. CUSTOMER DETAILS",
      `• Name: ${fd.get("fullName")}`,
      `• Phone: ${fd.get("phone")}`,
      "",
      "2. VEHICLE DETAILS",
      `• Vehicle: ${vehicleName}`,
      subtitle ? `• Variant: ${subtitle}` : "",
      desc ? `• Description: ${desc}` : "",
      `• ${rateLine}`,
      "",
      "3. RENTAL SCHEDULE",
      `• Pickup: ${pickupDisplay}`,
      `• Return: ${returnDisplay}`,
      `• Duration: ${rentalDays} day${rentalDays > 1 ? "s" : ""}`,
      "",
      "4. RENTAL ESTIMATE",
      `• ${totalLine}`,
      "",
      "5. EXTRA NOTES",
      `• ${fd.get("notes") || "-"}`,
      "",
      "6. IMPORTANT",
      "• Late return beyond the booked return time may incur extra charges.",
      "• Rider confirms a valid driving license and accepts rental terms."
    ].filter(Boolean);

    const waText = encodeURIComponent(msgLines.join("\n"));
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${waText}`, "_blank");

    messageEl.textContent = "WhatsApp opened — please review your booking and send.";
    messageEl.classList.add("success");
  });
}

// ========== HEADER SCROLL ==========

function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  onScroll();
  window.addEventListener("scroll", onScroll);
}

// ========== SCROLL REVEAL ==========

function setupRevealOnScroll() {
  let elements = document.querySelectorAll(".reveal");
  if (!elements.length) {
    document.querySelectorAll(".hero, .section, .hero-banner")
      .forEach(el => el.classList.add("reveal"));
    elements = document.querySelectorAll(".reveal");
  }

  if (!("IntersectionObserver" in window)) return;

  const obs = new IntersectionObserver((entries, o) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("is-visible");
        o.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  elements.forEach(el => obs.observe(el));
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
  updateRentalSummary();

  document.getElementById("sliderPrev")?.addEventListener("click", sliderPrev);
  document.getElementById("sliderNext")?.addEventListener("click", sliderNext);
});

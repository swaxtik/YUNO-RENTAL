const WHATSAPP_NUMBER = "918951849454";
const DAY_MS = 24 * 60 * 60 * 1000;

let allCards = [];
let currentFilter = "all";

function getLocalDateTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const [year, month, day] = dateValue.split("-").map(Number);
  const [hour = 10, minute = 0] = (timeValue || "10:00").split(":").map(Number);
  const dt = new Date(year, month - 1, day, hour, minute, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount || 0);
}

function formatDateHuman(dateValue) {
  if (!dateValue) return "";
  const [year, month, day] = dateValue.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatTime12h(timeValue) {
  if (!timeValue) return "";
  const [hour, minute] = timeValue.split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return "";
  return new Date(2026, 0, 1, hour, minute).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  });
}

function calculateRentalDays(pickupDate, returnDate, pickupTime = "10:00", returnTime = "10:00") {
  const start = getLocalDateTime(pickupDate, pickupTime);
  const end = getLocalDateTime(returnDate, returnTime);
  if (!start || !end || end <= start) return null;
  return Math.max(1, Math.ceil((end - start) / DAY_MS));
}

function calculateTotal(days, dailyRate, weeklyRate) {
  if (!days || !dailyRate) return 0;
  if (days >= 7 && weeklyRate) {
    const weeks = Math.floor(days / 7);
    const remainingDays = days % 7;
    return weeks * weeklyRate + remainingDays * dailyRate;
  }
  return days * dailyRate;
}

function getSelectedCard() {
  const select = document.getElementById("vehicleSelect");
  return allCards.find(card => card.dataset.id === select?.value) || null;
}

function getEstimate() {
  const pickupDate = document.getElementById("pickupDate")?.value;
  const returnDate = document.getElementById("returnDate")?.value;
  const pickupTime = document.getElementById("pickupTime")?.value || "10:00";
  const returnTime = document.getElementById("returnTime")?.value || "10:00";
  const card = getSelectedCard();
  const days = calculateRentalDays(pickupDate, returnDate, pickupTime, returnTime);

  if (!card || !days) return null;

  const dailyRate = Number(card.dataset.day || 0);
  const weeklyRate = Number(card.dataset.week || 0);
  const total = calculateTotal(days, dailyRate, weeklyRate);
  return { card, days, dailyRate, weeklyRate, total, pickupDate, returnDate, pickupTime, returnTime };
}

function updateRentalSummary() {
  const summary = document.getElementById("rentalSummary");
  if (!summary) return;

  const estimate = getEstimate();
  if (!estimate) {
    summary.textContent = "";
    summary.classList.remove("is-ready");
    return;
  }

  const { card, days, dailyRate, weeklyRate, total, pickupDate, returnDate, pickupTime, returnTime } = estimate;
  const vehicle = card.querySelector(".vehicle-name")?.textContent.trim() || "Selected vehicle";
  const weeklyText = weeklyRate ? ` Weekly rate considered after 7 days: ${formatINR(weeklyRate)}.` : "";
  summary.textContent = `${vehicle} - ${days} rental day${days > 1 ? "s" : ""} - ${formatINR(total)}.${weeklyText}`;
  summary.classList.add("is-ready");
}

function setMinDates() {
  const pickup = document.getElementById("pickupDate");
  const ret = document.getElementById("returnDate");
  const pickupTime = document.getElementById("pickupTime");
  const returnTime = document.getElementById("returnTime");
  if (!pickup || !ret) return;

  const today = new Date();
  const todayValue = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");

  pickup.min = todayValue;
  ret.min = todayValue;

  function addOneDay(dateValue) {
    const [year, month, day] = dateValue.split("-").map(Number);
    const date = new Date(year, month - 1, day + 1);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  pickup.addEventListener("change", () => {
    ret.min = pickup.value || todayValue;
    if (pickup.value && (!ret.value || ret.value <= pickup.value)) {
      ret.value = addOneDay(pickup.value);
    }
    if (returnTime && pickupTime?.value) returnTime.value = pickupTime.value;
    updateRentalSummary();
  });

  pickupTime?.addEventListener("change", () => {
    if (returnTime && !returnTime.dataset.edited) returnTime.value = pickupTime.value;
    updateRentalSummary();
  });

  returnTime?.addEventListener("input", () => {
    returnTime.dataset.edited = "true";
  });
}

function fillVehicleSelect() {
  const select = document.getElementById("vehicleSelect");
  if (!select) return;

  allCards = Array.from(document.querySelectorAll(".vehicle-card"));
  select.innerHTML = '<option value="">Select vehicle</option>';

  allCards.forEach(card => {
    if (card.dataset.available === "false") return;
    const option = document.createElement("option");
    option.value = card.dataset.id;
    option.textContent = `${card.querySelector(".vehicle-name")?.textContent.trim()} - ${formatINR(Number(card.dataset.day))}/day`;
    select.appendChild(option);
  });
}

function setupFleet() {
  allCards = Array.from(document.querySelectorAll(".vehicle-card"));

  document.querySelectorAll(".filter-btn").forEach(button => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter || "all";
      document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      applyFilter();
    });
  });

  allCards.forEach(card => {
    card.querySelector(".js-book-from-card")?.addEventListener("click", () => {
      const select = document.getElementById("vehicleSelect");
      if (select) select.value = card.dataset.id;
      document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
      updateRentalSummary();
    });
  });

  applyFilter();
}

function applyFilter() {
  const empty = document.getElementById("fleetEmpty");
  let visibleCount = 0;

  allCards.forEach(card => {
    const visible = currentFilter === "all" || card.dataset.day === currentFilter;
    card.hidden = !visible;
    if (visible) visibleCount += 1;
  });

  if (empty) empty.hidden = visibleCount !== 0;
}

function setupHeaderState() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  function updateHeader() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function setupActiveNavigation() {
  const links = Array.from(document.querySelectorAll(".nav a[href^='#'], .brand[href^='#']"));
  const sections = links
    .map(link => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (!links.length || !sections.length || !("IntersectionObserver" in window)) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const id = entry.target.getAttribute("id");
      links.forEach(link => {
        link.classList.toggle("is-active", link.getAttribute("href") === `#${id}`);
      });
    });
  }, {
    rootMargin: "-35% 0px -55% 0px",
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

function setupCardMotion() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll(".vehicle-card").forEach(card => {
    card.addEventListener("mousemove", event => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;
      card.style.transform = `translateY(-7px) rotateX(${y}deg) rotateY(${x}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "";
    });
  });
}

function setupBookingForm() {
  const form = document.getElementById("bookingForm");
  const message = document.getElementById("bookingMessage");
  if (!form || !message) return;

  form.querySelectorAll("input, select, textarea").forEach(input => {
    input.addEventListener("input", updateRentalSummary);
    input.addEventListener("change", updateRentalSummary);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    message.textContent = "";
    message.className = "form-message";

    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const vehicleId = String(formData.get("vehicle") || "");
    const estimate = getEstimate();

    if (!fullName || !phone || !vehicleId || !estimate) {
      message.textContent = "Please complete name, phone, vehicle, pickup and return details.";
      message.classList.add("error");
      return;
    }

    const { card, days, dailyRate, weeklyRate, total, pickupDate, returnDate, pickupTime, returnTime } = estimate;
    const vehicleName = card.querySelector(".vehicle-name")?.textContent.trim() || vehicleId;
    const vehicleDesc = card.querySelector(".vehicle-desc")?.textContent.trim() || "-";

    const lines = [
      "YUNO RIDE Booking Request",
      "",
      "Customer",
      `Name: ${fullName}`,
      `Phone: ${phone}`,
      "",
      "Vehicle",
      `Model: ${vehicleName}`,
      `ID: ${vehicleId}`,
      `Details: ${vehicleDesc}`,
      `Rate: ${formatINR(dailyRate)} per day${weeklyRate ? ` / ${formatINR(weeklyRate)} per week` : ""}`,
      "",
      "Rental",
      `Pickup: ${formatDateHuman(pickupDate)} at ${formatTime12h(pickupTime)}`,
      `Return: ${formatDateHuman(returnDate)} at ${formatTime12h(returnTime)}`,
      `Duration: ${days} rental day${days > 1 ? "s" : ""}`,
      `Estimated total: ${formatINR(total)}`,
      "",
      "Extras",
      `Helmet: ${formData.get("helmet") || "-"}`,
      `Notes: ${formData.get("notes") || "-"}`,
      "",
      "I confirm I have a valid driving license and agree to YUNO RIDE rental terms."
    ];

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
    message.textContent = "WhatsApp opened. Review the booking message and send it.";
    message.classList.add("success");

    const locationBurst = document.getElementById("locationBurst");
    if (locationBurst) {
      locationBurst.classList.remove("is-visible");
      window.requestAnimationFrame(() => {
        locationBurst.classList.add("is-visible");
      });
    }
  });
}

function setupNavigation() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupReveal() {
  const sections = document.querySelectorAll(".section, .hero");
  document
    .querySelectorAll(".stat-section article, .about-list div, .service-grid article, .vehicle-card, .timeline article, .info-grid article, .route-grid article, .ride-media-card, .faq-list details")
    .forEach((item, index) => {
      item.classList.add("stagger-item");
      item.style.setProperty("--stagger", String(index % 8));
    });

  if (!("IntersectionObserver" in window)) {
    sections.forEach(section => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });

  sections.forEach(section => observer.observe(section));
}

document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("yearSpan");
  if (year) year.textContent = new Date().getFullYear();

  fillVehicleSelect();
  setupFleet();
  setMinDates();
  setupBookingForm();
  setupNavigation();
  setupHeaderState();
  setupActiveNavigation();
  setupCardMotion();
  setupReveal();
  updateRentalSummary();
});

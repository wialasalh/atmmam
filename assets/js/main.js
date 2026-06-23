const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const currentYear = document.querySelector("[data-current-year]");
const contactForm = document.querySelector(".contact-form");
const packageTabs = document.querySelectorAll("[data-package-tab]");
const packageCards = document.querySelectorAll("[data-package]");

if (currentYear) {
  currentYear.textContent = new Date().getFullYear();
}

if (navToggle && navLinks) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";

    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "فتح القائمة" : "إغلاق القائمة");
    navLinks.classList.toggle("is-open", !isOpen);
  });

  navLinks.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      navToggle.setAttribute("aria-expanded", "false");
      navToggle.setAttribute("aria-label", "فتح القائمة");
      navLinks.classList.remove("is-open");
    }
  });
}

if (packageTabs.length && packageCards.length) {
  packageTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const selectedPackage = tab.getAttribute("data-package-tab");

      packageTabs.forEach((item) => item.classList.toggle("active", item === tab));
      packageCards.forEach((card) => {
        const cardPackage = card.getAttribute("data-package");
        card.classList.toggle(
          "is-hidden",
          cardPackage !== selectedPackage && cardPackage !== "all",
        );
      });
    });
  });
}

if (contactForm) {
  const status = contactForm.querySelector(".form-status");
  const submitButton = contactForm.querySelector("button[type='submit']");

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      if (status) {
        status.textContent = "فضلاً أكمل الحقول المطلوبة حتى نجهز طلبك.";
      }
      return;
    }

    const formData = new FormData(contactForm);
    const name = formData.get("name");
    const service = formData.get("service");

    if (status) {
      status.textContent = `تم استلام طلب ${service} يا ${name}. سنتواصل معك قريباً.`;
    }

    if (submitButton) {
      submitButton.textContent = "تم تجهيز الطلب";
      submitButton.classList.add("is-sent");
    }

    contactForm.reset();
  });
}

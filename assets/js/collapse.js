const button = document.querySelector("button.nav-link");
const collapse = document.querySelectorAll('.navbar-collapse');

button.addEventListener("click", () => {
    collapse.forEach((element) => {
        element.classList.remove('show');
    });
});
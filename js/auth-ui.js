document.addEventListener("DOMContentLoaded", async () => {
    const desktopContainer = document.querySelector("#auth-desktop");
    const mobileLink = document.querySelector("#auth-mobile-link");
    const compactContainer = document.querySelector("#auth-compact");

    const user = await AnimeMossAuth.getCurrentUser();

    updateDesktopAuth(desktopContainer, user);
    updateMobileAuth(mobileLink, user);
    updateCompactAuth(compactContainer, user);
});

function createUserIcon() {
    const wrapper = document.createElement("span");
    wrapper.className = "auth-user-icon";
    wrapper.setAttribute("aria-hidden", "true");

    wrapper.innerHTML = `
        <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle
                cx="12"
                cy="12"
                r="10"
            ></circle>

            <circle
                cx="12"
                cy="9"
                r="3"
            ></circle>

            <path
                d="M6.8 19c.9-2.7 2.7-4.1 5.2-4.1s4.3 1.4 5.2 4.1"
            ></path>
        </svg>
    `;

    return wrapper;
}

function createAuthLink({
    href,
    text,
    className = ""
}) {
    const link = document.createElement("a");

    link.href = href;
    link.className = `auth-indicator ${className}`.trim();

    const icon = createUserIcon();

    const label = document.createElement("span");
    label.className = "auth-indicator-text";
    label.textContent = text;

    link.appendChild(icon);
    link.appendChild(label);

    return link;
}

function updateDesktopAuth(container, user) {
    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (user) {
        const accountLink = createAuthLink({
            href: "account.html",
            text: `Hi, ${user.displayName}`,
            className: "auth-account-link"
        });

        container.appendChild(accountLink);
        return;
    }

    const loginLink = createAuthLink({
        href: "login.html",
        text: "Login",
        className: "auth-login-link"
    });

    container.appendChild(loginLink);
}

function updateMobileAuth(link, user) {
    if (!link) {
        return;
    }

    link.href = user ? "account.html" : "login.html";
    link.className = "mobile-drawer-link auth-mobile-link";

    link.innerHTML = "";

    const icon = createUserIcon();

    const label = document.createElement("span");
    label.textContent = user
        ? `Hi, ${user.displayName}`
        : "Login";

    link.appendChild(icon);
    link.appendChild(label);
}

function updateCompactAuth(container, user) {
    if (!container) {
        return;
    }

    container.innerHTML = "";

    const accountLink = createAuthLink({
        href: user ? "account.html" : "login.html",
        text: user ? `Hi, ${user.displayName}` : "Login",
        className: user
            ? "auth-account-link"
            : "auth-login-link"
    });

    container.appendChild(accountLink);
}

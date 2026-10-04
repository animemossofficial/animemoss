document.addEventListener("DOMContentLoaded", async () => {
    const title = document.querySelector("#verify-title");
    const subtitle = document.querySelector("#verify-subtitle");
    const action = document.querySelector("#verify-action");

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
        title.textContent = "Invalid verification link";
        subtitle.textContent =
            "This verification link is missing its token.";

        showMessage(
            "Please use the complete verification link from your email.",
            "error"
        );

        action.style.display = "block";
        return;
    }

    try {
        const response = await fetch(
            `https://animemoss-api-production.up.railway.app/auth/verify-email?token=${encodeURIComponent(token)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
            throw new Error(
                data?.error ||
                "This verification link is invalid or expired."
            );
        }

        title.textContent = "Email verified";
        subtitle.textContent =
            "Your AnimeMOSS email address has been successfully verified.";

        showMessage(
            "Your account is now verified.",
            "success"
        );

        action.textContent = "Continue to Login";
        action.href = "login.html";
        action.style.display = "block";

    } catch (error) {
        title.textContent = "Verification failed";
        subtitle.textContent =
            "We could not verify this email address.";

        showMessage(
            error.message ||
            "This verification link is invalid or expired.",
            "error"
        );

        action.textContent = "Back to Login";
        action.href = "login.html";
        action.style.display = "block";
    }
});

function showMessage(message, type) {
    const element = document.querySelector("#auth-message");

    element.textContent = message;
    element.className =
        `auth-message is-visible is-${type}`;
}

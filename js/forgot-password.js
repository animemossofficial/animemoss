document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#forgot-password-form");
    const button = document.querySelector("#forgot-submit");

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const email = form.email.value.trim().toLowerCase();

        if (!email) {
            showError("Please enter your email address.");
            form.email.focus();
            return;
        }

        button.disabled = true;
        button.textContent = "Sending Code...";

        try {
            const response = await fetch(
                "https://animemoss-api-production.up.railway.app/auth/forgot-password",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email
                    })
                }
            );

            const data =
                await response.json().catch(() => null);

            if (!response.ok) {
                const error = new Error(
                    data?.error ||
                    "Unable to process your request."
                );

                error.status = response.status;
                error.retryAfter =
                    response.headers.get("Retry-After");

                throw error;
            }

            if (!data?.challengeId) {
                throw new Error(
                    "Unable to start the password reset."
                );
            }

            window.location.href =
                `verify-reset-otp.html?challenge=${encodeURIComponent(
                    data.challengeId
                )}`;

        } catch (error) {
            if (error.status === 429) {
                showError(
                    "Too many requests. Please try again later."
                );
            } else {
                showError(
                    error.message ||
                    "Unable to process your request."
                );

                button.disabled = false;
                button.textContent = "Send Reset Code";
            }
        }
    });
});

function showError(message) {
    showMessage(message, "error");
}

function showMessage(message, type) {
    const element =
        document.querySelector("#auth-message");

    element.textContent = message;
    element.className =
        `auth-message is-visible is-${type}`;
}

function clearMessage() {
    const element =
        document.querySelector("#auth-message");

    element.textContent = "";
    element.className = "auth-message";
}

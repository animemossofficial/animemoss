document.addEventListener("DOMContentLoaded", () => {
    const params =
        new URLSearchParams(window.location.search);

    const challengeId =
        params.get("challenge");

    const form =
        document.querySelector("#verify-reset-form");

    const otpInput =
        document.querySelector("#reset-otp");

    const verifyButton =
        document.querySelector("#verify-otp-submit");

    const resendButton =
        document.querySelector("#resend-otp-btn");

    if (!challengeId) {
        verifyButton.disabled = true;
        resendButton.disabled = true;

        showError(
            "This password reset request is invalid or expired."
        );

        return;
    }

    startResendCountdown();

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        const otp =
            otpInput.value.trim();

        if (!/^\d{6}$/.test(otp)) {
            showError(
                "Please enter the 6-digit verification code."
            );

            otpInput.focus();
            return;
        }

        verifyButton.disabled = true;
        verifyButton.textContent = "Verifying...";

        try {
            const response = await fetch(
                "https://animemoss-api-production.up.railway.app/auth/verify-reset-otp",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        challengeId,
                        otp
                    })
                }
            );

            const data =
                await response.json().catch(() => null);

            if (!response.ok) {
                const error = new Error(
                    data?.error ||
                    "Invalid or expired verification code."
                );

                error.status = response.status;
                throw error;
            }

            if (!data?.resetToken) {
                throw new Error(
                    "Unable to continue password reset."
                );
            }

            sessionStorage.setItem(
                "animemoss_password_reset_token",
                data.resetToken
            );

            window.location.href =
                "reset-password.html";

        } catch (error) {
            showError(
                error.message ||
                "Invalid or expired verification code."
            );

            verifyButton.disabled = false;
            verifyButton.textContent = "Verify Code";
        }
    });

    resendButton.addEventListener("click", async () => {
        resendButton.disabled = true;

        try {
            const response = await fetch(
                "https://animemoss-api-production.up.railway.app/auth/resend-reset-otp",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        challengeId
                    })
                }
            );

            const data =
                await response.json().catch(() => null);

            const retryAfter =
                Number(
                    response.headers.get("Retry-After")
                );

            if (response.status === 429) {
                showError(
                    data?.error ||
                    "Please wait before requesting another code."
                );

                startResendCountdown(
                    Number.isFinite(retryAfter) &&
                    retryAfter > 0
                        ? retryAfter
                        : 60
                );

                return;
            }

            if (!response.ok) {
                throw new Error(
                    data?.error ||
                    "Unable to resend the code."
                );
            }

            showSuccess(
                "A new verification code has been sent."
            );

            startResendCountdown();

        } catch (error) {
            showError(
                error.message ||
                "Unable to resend the code."
            );

            resendButton.disabled = false;
            resendButton.textContent = "Resend Code";
        }
    });

    function startResendCountdown(seconds = 60) {
        resendButton.disabled = true;

        let remaining = seconds;

        resendButton.textContent =
            `Resend Code in ${remaining}s`;

        const timer =
            window.setInterval(() => {
                remaining -= 1;

                if (remaining <= 0) {
                    window.clearInterval(timer);

                    resendButton.disabled = false;
                    resendButton.textContent =
                        "Resend Code";

                    return;
                }

                resendButton.textContent =
                    `Resend Code in ${remaining}s`;
            }, 1000);
    }
});

function showError(message) {
    showMessage(message, "error");
}

function showSuccess(message) {
    showMessage(message, "success");
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

import { useEffect, useState } from "react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie_consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };
/*
  const rejectCookies = () => {
    localStorage.setItem("cookie_consent", "rejected");
    setVisible(false);
  };
*/
  if (!visible) return null;
/*          <button className="btn secondary" onClick={rejectCookies}>
            Reject
          </button>
                    We use cookies to improve functionality and analytics. By clicking
          "Accept", you agree to our use of cookies.
          */
  return (
    <div className="cookie-banner">
      <div className="cookie-content">
        <p>
           We use cookies for basic functionality of the website. By using the website you agree to our use of cookies.
        </p>

        <div className="cookie-actions">

          <button className="cookie-btn primary" onClick={acceptCookies}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
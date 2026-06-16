export const HEADER_LOGO_SRC = "/branding/logo-header.png";

export function AppLogo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img src={HEADER_LOGO_SRC} alt="" />
    </span>
  );
}

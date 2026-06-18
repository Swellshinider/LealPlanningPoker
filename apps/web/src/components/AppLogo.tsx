export const HEADER_LOGO_LIGHT_SRC = "/branding/logo-header-light.png";
export const HEADER_LOGO_DARK_SRC = "/branding/logo-header-dark.png";

export function AppLogo() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <img className="brand-mark__img brand-mark__img--light" src={HEADER_LOGO_LIGHT_SRC} alt="" />
      <img className="brand-mark__img brand-mark__img--dark" src={HEADER_LOGO_DARK_SRC} alt="" />
    </span>
  );
}

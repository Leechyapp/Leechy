import LandingPageHeroSectionMobile from './LandingPageHeroSectionMobile/LandingPageHeroSectionMobile.js';
import LandingPageHeroSectionDesktop from './LandingPageHeroSectionDesktop/LandingPageHeroSectionDesktop.js';
import css from './LandingPageHeroSection.module.scss';

const LandingPageHeroSection = () => {
  return (
    <>
      <div className={css.landingPageHeroSectionMobile}>
        <LandingPageHeroSectionMobile />
      </div>
      <div className={css.landingPageHeroSectionDesktop}>
        <LandingPageHeroSectionDesktop />
      </div>
    </>
  );
};

export default LandingPageHeroSection;

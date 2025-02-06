import React from 'react';
import css from './LandingPageHeroSection.module.scss';

const LandingPageHeroSection = () => {
  const redirectToSearchPage = () => {
    console.log('click');
  };

  return (
    <div className={css.frame}>
      <div className={css.overlapGroupWrapper}>
        <div className={css.overlapGroup}>
          <div className={css.searchForm}>
            <div className={css.watermark}>Leechy</div>
            <div className={css.overlap2}>
              <div className={css.textWrapper2}>Location</div>
              <img
                className={css.vector}
                alt="Vector"
                src="https://c.animaapp.com/x4t9OtXc/img/vector-1.svg"
              />
            </div>
            <div className={css.overlap3}>
              <div className={css.textWrapper2}>Dates</div>
              <img
                className={css.img}
                alt="Vector"
                src="https://c.animaapp.com/x4t9OtXc/img/vector.svg"
              />
            </div>
            <div className={css.divWrapper}>
              <div className={css.textWrapper3}>Category</div>
            </div>
            <div className={css.searchButton}>
              <div className={css.textWrapper4}>Search</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageHeroSection;

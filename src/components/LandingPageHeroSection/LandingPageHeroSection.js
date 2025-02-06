import React from 'react';
import css from './LandingPageHeroSection.module.scss';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';

const LandingPageHeroSection = () => {
  const history = useHistory();
  const redirectToSearchPage = () => {
    console.log('redirectToSearchPage clicked');
    let searchQuery = '/s';
    history.push(searchQuery);
  };

  return (
    <div className={css.frame}>
      <div className={css.overlapGroupWrapper}>
        <div className={css.overlapGroup}>
          <div className={css.searchForm}>
            <div className={css.watermark}>Leechy</div>
            <div className={css.locationWrapper}>
              <div className={css.locationPlaceholder}>Location</div>
              <img
                className={css.vector}
                alt="Vector"
                src="https://c.animaapp.com/x4t9OtXc/img/vector-1.svg"
              />
            </div>
            <div className={css.datesWrapper}>
              <div className={css.datesPlaceholder}>Dates</div>
              <img
                className={css.img}
                alt="Vector"
                src="https://c.animaapp.com/x4t9OtXc/img/vector.svg"
              />
            </div>
            <div className={css.categoryDropdownWrapper}>
              <div className={css.categoryPlaceholder}>Category</div>
            </div>
            <div className={css.searchButton} onClick={() => redirectToSearchPage()}>
              <div className={css.searchButtonText}>Search</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPageHeroSection;

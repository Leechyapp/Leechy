import React from 'react';
import css from './LandingPageHeroSection.module.scss';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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
              <FontAwesomeIcon className={css.icon} icon="map-marker-alt" />
            </div>
            <div className={css.datesWrapper}>
              <div className={css.datesPlaceholder}>Dates</div>
              <FontAwesomeIcon className={css.icon} icon="calendar" />
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

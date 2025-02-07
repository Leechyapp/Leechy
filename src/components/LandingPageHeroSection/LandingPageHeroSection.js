import React, { useState } from 'react';
import css from './LandingPageHeroSection.module.scss';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import leechyWatermarkImg from './assets/leechy-watermark.jpeg';
import Modal from '../Modal/Modal';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { useDispatch } from 'react-redux';

const LandingPageHeroSection = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [location, setLocation] = useState();
  const [dates, setDates] = useState();
  const [category, setCategory] = useState();

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const redirectToSearchPage = () => {
    console.log('redirectToSearchPage clicked');
    let searchQuery = '/s';
    if (category) {
      searchQuery += `?pub_categoryLevel1=${category}`;
    }
    history.push(searchQuery);
  };

  return (
    <div className={css.frame}>
      <div className={css.overlapGroupWrapper}>
        <div className={css.overlapGroup}>
          <div className={css.searchForm}>
            <div className={css.row}>
              <div className={css.col12}>
                <div className={css.watermark}>
                  <img src={leechyWatermarkImg} />
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.sloganWrapper}>
                  <p>The rental marketplace for everyone</p>
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.locationWrapper} onClick={() => setShowLocationModal(true)}>
                  <div className={css.locationPlaceholder}>Location</div>
                  <FontAwesomeIcon className={css.icon} icon="map-marker-alt" />
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.datesWrapper} onClick={() => setShowDateModal(true)}>
                  <div className={css.datesPlaceholder}>Dates</div>
                  <FontAwesomeIcon className={css.icon} icon="calendar" />
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.categoryDropdownWrapper}>
                  <select
                    className={css.categoryDropdown}
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="" className={css.categoryPlaceholder}>
                      Category
                    </option>
                    <option value="furniture">Furniture</option>
                    <option value="clothing">Clothing</option>
                    <option value="electronics">Electronics</option>
                  </select>
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.searchButton} onClick={() => redirectToSearchPage()}>
                  <div className={css.searchButtonText}>Search</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Modal
        id="LandingPageHeroSection.locationModal"
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        usePortal={false}
        onManageDisableScrolling={onManageDisableScrolling}
      >
        Test
      </Modal>
      <Modal
        id="LandingPageHeroSection.dateModal"
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        usePortal={false}
        onManageDisableScrolling={onManageDisableScrolling}
      >
        Dates
      </Modal>
    </div>
  );
};

export default LandingPageHeroSection;

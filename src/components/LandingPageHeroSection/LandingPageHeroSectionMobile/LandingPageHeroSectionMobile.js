import React, { useEffect, useState } from 'react';
import css from './LandingPageHeroSectionMobile.module.scss';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import leechyWatermarkImg from '../assets/leechy-watermark.png';
import Modal from '../../Modal/Modal';
import { manageDisableScrolling } from '../../../ducks/ui.duck';
import { useDispatch } from 'react-redux';
import { FieldLocationAutocompleteInput } from '../../LocationAutocompleteInput/LocationAutocompleteInput';
import { FormattedMessage, injectIntl } from 'react-intl';
import { Form as FinalForm } from 'react-final-form';
import Form from '../../Form/Form';
import momentTz from 'moment-timezone';
import DateRangeInput from '../../FieldDateRangeInput/DateRangeInput';
import moment from 'moment-timezone';
import { getPredictionAddress, placeBounds } from '../../LocationAutocompleteInput/GeocoderMapbox';
import { useConfiguration } from '../../../context/configurationContext';
import isIOSPlatform from '../../../util/isIOSPlatform';
import listingCategoriesSet from '../assets/listingCategoriesSet';
import HeroSectionDateRangeFilterInput from '../HeroSectionDateRangeFilterInput/HeroSectionDateRangeFilterInput';

const identity = v => v;

const LandingPageHeroSectionMobile = injectIntl(props => {
  const { intl } = props;

  const config = useConfiguration();
  const history = useHistory();
  const timeZone = moment.tz.guess();
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);

  const [category, setCategory] = useState();
  const [categoryList, setCategoryList] = useState([]);

  const [inputDate, setInputDate] = useState();
  const [bookingEndDate, setBookingEndDate] = useState();
  const [bookingStartDate, setBookingStartDate] = useState();
  const [selectedDatePlaceholder, setSelectedDatePlaceholder] = useState();

  const [prediction, setPrediction] = useState();
  const [location, setLocation] = useState();
  const [locationText, setLocationText] = useState();

  useEffect(() => {
    if (config?.listing?.listingFields) {
      const listingFields = config.listing.listingFields;
      const listingCategories = [{ key: 'tools-machinery', name: 'Tools & Machinery' }];
      listingFields.forEach(listingField => {
        if (listingCategoriesSet.has(listingField.key)) {
          listingCategories.push({
            key: listingField.key,
            name: listingField.filterConfig.label,
          });
        }
      });
      listingCategories.sort((a, b) => (a.key > b.key ? 1 : -1));
      setCategoryList(listingCategories);
    }
  }, []);

  useEffect(() => {
    if (bookingStartDate && bookingEndDate) {
      const start = onFormatDate(bookingStartDate, 'MMM D');
      const end = onFormatDate(bookingEndDate, 'MMM D');
      setSelectedDatePlaceholder(`${start} to ${end}`);
      setShowDateModal(false);
    }
  }, [bookingStartDate, bookingEndDate]);

  const onFormatDate = (date, format = 'YYYY-MM-DD') => {
    return moment(date).format(format);
  };

  const redirectToSearchPage = () => {
    let bounds;
    if (prediction) {
      const predictionPlaceBounds = placeBounds(prediction);
      if (predictionPlaceBounds) {
        bounds = [
          predictionPlaceBounds.ne.lat,
          predictionPlaceBounds.ne.lng,
          predictionPlaceBounds.sw.lat,
          predictionPlaceBounds.sw.lng,
        ].join(',');
      }
    }

    const searchParams = {
      ...(category ? { pub_categoryLevel1: category } : {}),
      ...(prediction
        ? {
            address: getPredictionAddress(prediction),
            bounds,
            mapSearch: 'true',
          }
        : {}),
      ...(bookingStartDate && bookingEndDate
        ? { dates: `${bookingStartDate},${bookingEndDate}` }
        : {}),
    };

    const searchQuery =
      Object.keys(searchParams).length > 0
        ? '/s?' + new URLSearchParams(searchParams).toString().replace(/,/g, '%2C')
        : '/s';
    history.push(searchQuery);
  };

  const onChangeLocation = location => {
    setLocation(location);
  };

  const onBlurLocation = location => {
    if (location && location?.predictions?.length > 0) {
      const firstPrediction = location.predictions[0];
      setPrediction(firstPrediction);
      setLocationText(firstPrediction['place_name_en-US']);
      setShowLocationModal(false);
    }
  };

  const onChangeDate = values => {
    if (values) {
      setInputDate(values);
      if (values.startDate) {
        const startDateTz = momentTz(values.startDate)
          .tz(timeZone)
          .format();
        setBookingStartDate(startDateTz);
      }
      if (values.endDate) {
        const endDateTz = momentTz(values.endDate)
          .tz(timeZone)
          .format();
        setBookingEndDate(endDateTz);
      }
    }
  };

  const iosCushion = isIOSPlatform && (
    <>
      <br />
      <br />
    </>
  );

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
                  <p>
                    <FormattedMessage id="LandingPageHeroSection.heading" />
                  </p>
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.locationWrapper} onClick={() => setShowLocationModal(true)}>
                  {locationText ? (
                    <div className={css.locationPlaceholder}>{locationText}</div>
                  ) : (
                    <div className={css.locationPlaceholder}>
                      <FormattedMessage id="LandingPageHeroSection.location.placeholder" />
                    </div>
                  )}
                  <FontAwesomeIcon className={css.icon} icon="map-marker-alt" />
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.datesWrapper} onClick={() => setShowDateModal(true)}>
                  {selectedDatePlaceholder ? (
                    <div className={css.datesPlaceholder}>{selectedDatePlaceholder}</div>
                  ) : (
                    <div className={css.datesPlaceholder}>
                      <FormattedMessage id="LandingPageHeroSection.dates.placeholder" />
                    </div>
                  )}
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
                      {intl.formatMessage({ id: 'LandingPageHeroSection.category.placeholder' })}
                    </option>
                    {categoryList.length > 0 &&
                      categoryList.map(category => (
                        <option key={category.key} value={category.key}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.searchButton} onClick={() => redirectToSearchPage()}>
                  <div className={css.searchButtonText}>
                    <FormattedMessage id="LandingPageHeroSection.search.button.text" />
                  </div>
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
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <FinalForm
          {...props}
          onSubmit={() => {}}
          render={formRenderProps => {
            const { formId, autoFocus, intl } = formRenderProps;
            return (
              <>
                {iosCushion}
                <Form className={css.locationModalForm}>
                  <FieldLocationAutocompleteInput
                    rootClassName={css.locationAddress}
                    inputClassName={css.locationAutocompleteInput}
                    iconClassName={css.locationAutocompleteInputIcon}
                    predictionsClassName={css.predictionsRoot}
                    validClassName={css.validLocation}
                    autoFocus={autoFocus}
                    name={`${formId}.location`}
                    label={intl.formatMessage({ id: 'EditListingLocationForm.address' })}
                    placeholder={intl.formatMessage({
                      id: 'EditListingLocationForm.addressPlaceholder',
                    })}
                    useDefaultPredictions={false}
                    format={identity}
                    valueFromForm={location}
                    input={{
                      onBlur: location => onBlurLocation(location),
                      onFocus: () => {},
                      onChange: location => onChangeLocation(location),
                    }}
                  />
                </Form>
              </>
            );
          }}
        />
      </Modal>
      <Modal
        id="LandingPageHeroSection.dateModal"
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        usePortal
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <HeroSectionDateRangeFilterInput
          onChangeDate={onChangeDate}
          inputDate={inputDate}
          iosCushion={iosCushion}
        />
      </Modal>
    </div>
  );
});

export default LandingPageHeroSectionMobile;

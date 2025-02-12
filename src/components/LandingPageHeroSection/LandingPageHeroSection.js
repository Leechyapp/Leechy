import React, { useEffect, useState } from 'react';
import css from './LandingPageHeroSection.module.scss';
import { useHistory } from 'react-router-dom/cjs/react-router-dom.min';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import leechyWatermarkImg from './assets/leechy-watermark.png';
import Modal from '../Modal/Modal';
import { manageDisableScrolling } from '../../ducks/ui.duck';
import { useDispatch } from 'react-redux';
import { FieldLocationAutocompleteInput } from '../LocationAutocompleteInput/LocationAutocompleteInput';
import { injectIntl } from 'react-intl';
import { Form as FinalForm } from 'react-final-form';
import Form from '../Form/Form';
import momentTz from 'moment-timezone';
import DateRangeInput from '../FieldDateRangeInput/DateRangeInput';
import { getDefaultTimeZoneOnBrowser } from '../../util/dates';
import moment from 'moment-timezone';

const identity = v => v;

const LandingPageHeroSection = injectIntl(props => {
  const { intl } = props;

  const history = useHistory();
  const timeZone = getDefaultTimeZoneOnBrowser();
  const dispatch = useDispatch();
  const onManageDisableScrolling = (componentId, disableScrolling) => {
    dispatch(manageDisableScrolling(componentId, disableScrolling));
  };

  const [location, setLocation] = useState();
  const [finalLocation, setFinalLocation] = useState();
  const [locationText, setLocationText] = useState();
  const [category, setCategory] = useState();

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [inputDate, setInputDate] = useState();
  const [bookingStartDate, setBookingStartDate] = useState();
  const [bookingEndDate, setBookingEndDate] = useState();
  const [selectedDatePlaceholder, setSelectedDatePlaceholder] = useState();

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
    console.log('redirectToSearchPage clicked');
    const searchParams = {
      ...(category ? { pub_categoryLevel1: category } : {}),
      ...(finalLocation
        ? {
            address: encodeURIComponent(finalLocation['place_name_en-US']),
            bounds: encodeURIComponent(finalLocation['bbox']),
          }
        : {}),
      ...(bookingStartDate && bookingEndDate
        ? { startDate: onFormatDate(bookingStartDate), endDate: onFormatDate(bookingEndDate) }
        : {}),
    };
    const searchQuery =
      Object.keys(searchParams).length > 0
        ? '/s?' + new URLSearchParams(searchParams).toString()
        : '/s';
    history.push(searchQuery);
  };

  const onChangeLocation = location => {
    setLocation(location);
  };

  const onBlurLocation = location => {
    if (location && location?.predictions?.length > 0) {
      const firstPrediction = location.predictions[0];
      console.log(`onBlurLocation`, JSON.stringify(firstPrediction, null, 2));
      setFinalLocation(firstPrediction);
      setLocationText(firstPrediction['place_name_en-US']);
      setShowLocationModal(false);
    }
  };

  const onChangeDate = values => {
    console.log('onChangeDate', values);
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
                  <p>The rental marketplace for everyone.</p>
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.locationWrapper} onClick={() => setShowLocationModal(true)}>
                  {locationText ? (
                    <div className={css.locationPlaceholder}>{locationText}</div>
                  ) : (
                    <div className={css.locationPlaceholder}>Location</div>
                  )}
                  <FontAwesomeIcon className={css.icon} icon="map-marker-alt" />
                </div>
              </div>
              <div className={css.col12}>
                <div className={css.datesWrapper} onClick={() => setShowDateModal(true)}>
                  {selectedDatePlaceholder ? (
                    <div className={css.datesPlaceholder}>{selectedDatePlaceholder}</div>
                  ) : (
                    <div className={css.datesPlaceholder}>Dates</div>
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
        <FinalForm
          {...props}
          onSubmit={onSubmit}
          render={formRenderProps => {
            const { formId, autoFocus, intl } = formRenderProps;
            return (
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
            );
          }}
        />
      </Modal>
      <Modal
        id="LandingPageHeroSection.dateModal"
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        usePortal={false}
        onManageDisableScrolling={onManageDisableScrolling}
      >
        <DateRangeInput
          onChange={onChangeDate}
          onBlur={() => {}}
          onFocus={() => {}}
          isOutsideRange={() => {}}
          value={inputDate}
        />
      </Modal>
    </div>
  );
});

export default LandingPageHeroSection;

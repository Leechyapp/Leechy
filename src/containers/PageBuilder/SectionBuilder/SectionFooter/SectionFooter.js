import React from 'react';
import { arrayOf, bool, func, node, number, object, shape, string } from 'prop-types';
import classNames from 'classnames';
import { LinkedLogo } from '../../../../components';

import Field from '../../Field';
import BlockBuilder from '../../BlockBuilder';

import SectionContainer from '../SectionContainer';
import css from './SectionFooter.module.scss';

import { default as appStoreBadge } from '../../../../assets/mobile-app-store-badges/Download_on_the_App_Store_Badge.svg';
import { default as googlePlayStoreBadge } from '../../../../assets/mobile-app-store-badges/google-play-badge.png';
import { FormattedMessage } from 'react-intl';
import isNativePlatform from '../../../../util/isNativePlatform';
import { useLocation } from 'react-router-dom/cjs/react-router-dom.min';

// The number of columns (numberOfColumns) affects styling

const GRID_CONFIG = [
  { contentCss: css.contentCol1, gridCss: css.gridCol1 },
  { contentCss: css.contentCol2, gridCss: css.gridCol2 },
  { contentCss: css.contentCol3, gridCss: css.gridCol3 },
  { contentCss: css.contentCol4, gridCss: css.gridCol4 },
];
const MAX_MOBILE_SCREEN_WIDTH = 1024;

const getIndex = numberOfColumns => numberOfColumns - 1;

const getContentCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.contentCss : GRID_CONFIG[0].contentCss;
};

const getGridCss = numberOfColumns => {
  const contentConfig = GRID_CONFIG[getIndex(numberOfColumns)];
  return contentConfig ? contentConfig.gridCss : GRID_CONFIG[0].gridCss;
};

// Section component that's able to show blocks in multiple different columns (defined by "numberOfColumns" prop)
const SectionFooter = props => {
  const {
    sectionId,
    className,
    rootClassName,
    numberOfColumns,
    socialMediaLinks,
    slogan,
    appearance,
    copyright,
    blocks,
    options,
    linkLogoToExternalSite,
  } = props;

  const location = useLocation();
  const isHomeLandingPage = location?.pathname === '/';

  // If external mapping has been included for fields
  // E.g. { h1: { component: MyAwesomeHeader } }
  const fieldComponents = options?.fieldComponents;
  const fieldOptions = { fieldComponents };
  const linksWithBlockId = socialMediaLinks?.map(sml => {
    return {
      ...sml,
      blockId: sml.link.platform,
    };
  });

  const showSocialMediaLinks = socialMediaLinks?.length > 0;
  const hasMatchMedia = typeof window !== 'undefined' && window?.matchMedia;
  const isMobileLayout = hasMatchMedia
    ? window.matchMedia(`(max-width: ${MAX_MOBILE_SCREEN_WIDTH}px)`)?.matches
    : true;
  const logoLayout = isMobileLayout ? 'mobile' : 'desktop';

  // use block builder instead of mapping blocks manually

  const redirectToAppStore = () => {
    window.open('https://apps.apple.com/us/app/leechy/id6505043207', '_blank');
  };

  const redirectToGooglePlayStore = () => {
    window.open('https://play.google.com/store/apps/details?id=com.leechy.app', '_blank');
  };

  const leechyAppButtons = !isNativePlatform && (
    <>
      <div className={css.rowUnsetMarginLR}>
        <div className={css.appIcons}>
          <div className={css.col5}>
            <a onClick={() => redirectToAppStore()}>
              <div className={css.storeBadgeContainer}>
                <img
                  className={[css.storeImg, css.appStoreBadge].join(' ')}
                  src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us?size=250x83&amp;releaseDate=1276560000&h=7e7b68fad19738b5649a1bfb78ff46e9"
                  alt="Download on the App Store"
                />
              </div>
            </a>
          </div>
          <div className={css.col5}>
            <div className={css.storeBadgeContainer}>
              <a onClick={() => redirectToGooglePlayStore()}>
                <img
                  className={[css.storeImg, css.googlePlayStoreBadge].join(' ')}
                  src="https://play.google.com/intl/en_us/badges/images/generic/en_badge_web_generic.png"
                  alt="GET IT ON Google Play"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return isNativePlatform && !isHomeLandingPage ? (
    <div className={css.mobileAppReplacementFooter}></div>
  ) : (
    <SectionContainer
      as="footer"
      id={sectionId}
      className={className || css.root}
      rootClassName={rootClassName}
      appearance={appearance}
      options={fieldOptions}
    >
      <div className={css.footer}>
        <div className={classNames(css.content, getContentCss(numberOfColumns))}>
          <div>
            <LinkedLogo
              rootClassName={css.logoLink}
              logoClassName={css.logoWrapper}
              logoImageClassName={css.logoImage}
              linkToExternalSite={linkLogoToExternalSite}
              layout={logoLayout}
            />
          </div>
          <div className={css.sloganMobile}>
            <Field data={slogan} className={css.slogan} />
          </div>
          <div className={css.detailsInfo}>
            <div className={css.sloganDesktop}>
              <Field data={slogan} className={css.slogan} />
            </div>
            {showSocialMediaLinks ? (
              <div className={css.icons}>
                <BlockBuilder blocks={linksWithBlockId} sectionId={sectionId} options={options} />
              </div>
            ) : null}
            {leechyAppButtons}
            <Field data={copyright} className={css.copyright} />
          </div>
          <div className={classNames(css.grid, getGridCss(numberOfColumns))}>
            <BlockBuilder blocks={blocks} sectionId={sectionId} options={options} />
          </div>
        </div>
      </div>
      {isNativePlatform && <div className={css.nativeFooterCushion}></div>}
    </SectionContainer>
  );
};

const propTypeOption = shape({
  fieldComponents: shape({ component: node, pickValidProps: func }),
});

SectionFooter.defaultProps = {
  className: null,
  rootClassName: null,
  textClassName: null,
  numberOfColumns: 1,
  socialMediaLinks: [],
  slogan: null,
  copyright: null,
  appearance: null,
  blocks: [],
  options: null,
};

SectionFooter.propTypes = {
  sectionId: string.isRequired,
  className: string,
  rootClassName: string,
  numberOfColumns: number,
  socialMediaLinks: arrayOf(object),
  slogan: object,
  copyright: object,
  appearance: object,
  blocks: arrayOf(object),
  options: propTypeOption,
};

export default SectionFooter;

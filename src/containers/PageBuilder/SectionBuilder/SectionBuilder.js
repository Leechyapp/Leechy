import React, { useEffect, useState } from 'react';
import { arrayOf, bool, func, node, oneOf, shape, string } from 'prop-types';
import classNames from 'classnames';

// Section components
import SectionArticle from './SectionArticle';
import SectionCarousel from './SectionCarousel';
import SectionColumns from './SectionColumns';
import SectionFeatures from './SectionFeatures';
import SectionHero from './SectionHero';

// Styles
// Note: these contain
// - shared classes that are passed as defaultClasses
// - dark theme overrides
// TODO: alternatively, we could consider more in-place way of theming components
import css from './SectionBuilder.module.css';
import SectionFooter from './SectionFooter';
// import isPlatformBrowser from '../../../util/isPlatformBrowser.util';
import isNativePlatform from '../../../util/isNativePlatform';

// These are shared classes.
// Use these to have consistent styles between different section components
// E.g. share the same title styles
const DEFAULT_CLASSES = {
  sectionDetails: css.sectionDetails,
  title: css.title,
  description: css.description,
  ctaButton: css.ctaButton,
  blockContainer: css.blockContainer,
};

/////////////////////////////////////////////
// Mapping of section types and components //
/////////////////////////////////////////////

const defaultSectionComponents = {
  article: { component: SectionArticle },
  carousel: { component: SectionCarousel },
  columns: { component: SectionColumns },
  features: { component: SectionFeatures },
  footer: { component: SectionFooter },
  hero: { component: SectionHero },
};

const MIN_SCREEN_WIDTH_LANDING_PAGE_HERO = 768;

//////////////////////
// Section builder //
//////////////////////

const SectionBuilder = props => {
  const { assetName, sections, options } = props;
  const { sectionComponents = {}, isInsideContainer, ...otherOption } = options || {};

  // If there's no sections, we can't render the correct section component
  if (!sections || sections.length === 0) {
    return null;
  }

  // Selection of Section components
  const components = { ...defaultSectionComponents, ...sectionComponents };
  const getComponent = sectionType => {
    const config = components[sectionType];
    return config?.component;
  };

  // Generate unique ids for sections if operator has managed to create duplicates
  // E.g. "foobar", "foobar1", and "foobar2"
  const sectionIds = [];
  const getUniqueSectionId = (sectionId, index) => {
    const candidate = sectionId || `section-${index + 1}`;
    if (sectionIds.includes(candidate)) {
      let sequentialCandidate = `${candidate}1`;
      for (let i = 2; sectionIds.includes(sequentialCandidate); i++) {
        sequentialCandidate = `${candidate}${i}`;
      }
      return getUniqueSectionId(sequentialCandidate, index);
    } else {
      sectionIds.push(candidate);
      return candidate;
    }
  };

  // const [screenWidth, setScreenWidth] = useState(isPlatformBrowser() ? window.innerWidth : null);
  // useEffect(() => {
  //   if (screenWidth) {
  //     const handleResize = () => setScreenWidth(window.innerWidth);
  //     window.addEventListener('resize', handleResize);
  //     return () => window.removeEventListener('resize', handleResize);
  //   }
  // }, []);

  return (
    <>
      {sections.map((section, index) => {
        const Section = getComponent(section.sectionType);
        // If the default "dark" theme should be applied (when text color is white).
        // By default, this information is stored to customAppearance field
        const isDarkTheme =
          section?.appearance?.fieldType === 'customAppearance' &&
          section?.appearance?.textColor === 'white';
        const classes = classNames({ [css.darkTheme]: isDarkTheme });
        const sectionId = getUniqueSectionId(section.sectionId, index);

        // if (isNativePlatform && screenWidth && assetName === 'landing-page') {
        if (isNativePlatform && assetName === 'landing-page') {
          if (section?.sectionName === 'Marketplace introduction') {
            // if (screenWidth < MIN_SCREEN_WIDTH_LANDING_PAGE_HERO) {
            return null;
            // }
          }
        }

        if (Section) {
          return (
            <Section
              key={`${sectionId}_i${index}`}
              className={classes}
              defaultClasses={DEFAULT_CLASSES}
              isInsideContainer={isInsideContainer}
              options={otherOption}
              {...section}
              sectionId={sectionId}
            />
          );
        } else {
          // If the section type is unknown, the app can't know what to render
          console.warn(
            `Unknown section type (${section.sectionType}) detected using sectionName (${section.sectionName}).`
          );
          return null;
        }
      })}
    </>
  );
};

const propTypeSection = shape({
  sectionId: string,
  sectionName: string,
  sectionType: oneOf(['article', 'carousel', 'columns', 'features', 'hero']).isRequired,
  // Plus all kind of unknown fields.
  // BlockBuilder doesn't really need to care about those
});

const propTypeOption = shape({
  fieldComponents: shape({ component: node, pickValidProps: func }),
  blockComponents: shape({ component: node }),
  sectionComponents: shape({ component: node }),
  // isInsideContainer boolean means that the section is not taking
  // the full viewport width but is run inside some wrapper.
  isInsideContainer: bool,
});

const defaultSections = shape({
  sections: arrayOf(propTypeSection),
  options: propTypeOption,
});

const customSection = shape({
  sectionId: string.isRequired,
  sectionType: string.isRequired,
  // Plus all kind of unknown fields.
  // BlockBuilder doesn't really need to care about those
});
const propTypeOptionForCustomSections = shape({
  fieldComponents: shape({ component: node, pickValidProps: func }),
  blockComponents: shape({ component: node }),
  sectionComponents: shape({ component: node }).isRequired,
  // isInsideContainer boolean means that the section is not taking
  // the full viewport width but is run inside some wrapper.
  isInsideContainer: bool,
});

const customSections = shape({
  sections: arrayOf(customSection),
  options: propTypeOptionForCustomSections.isRequired,
});

SectionBuilder.defaultProps = {
  sections: [],
  options: null,
};

SectionBuilder.propTypes = oneOf([defaultSections, customSections]).isRequired;

export default SectionBuilder;

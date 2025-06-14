import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useHistory } from 'react-router-dom';

import { IconSpinner, LayoutComposer } from '../../components/index.js';
import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer.js';
import FooterContainer from '../FooterContainer/FooterContainer.js';

import { validProps } from './Field';

import SectionBuilder from './SectionBuilder/SectionBuilder.js';
import StaticPage from './StaticPage.js';

import css from './PageBuilder.module.css';
import NativeBottomNavbar from '../../components/NativeBottomNavbar/NativeBottomNavbar.js';
import PullToRefresh from '../../components/PullToRefresh/PullToRefresh.js';
import LandingPageHeroSection from '../../components/LandingPageHeroSection/LandingPageHeroSection.js';
import IconSearchFilter from '../../components/IconSearchFilter/IconSearchFilter';

const getMetadata = (meta, schemaType, fieldOptions) => {
  const { pageTitle, pageDescription, socialSharing } = meta;

  // pageTitle is used for <title> tag in addition to page schema for SEO
  const title = validProps(pageTitle, fieldOptions)?.content;
  // pageDescription is used for different <meta> tags in addition to page schema for SEO
  const description = validProps(pageDescription, fieldOptions)?.content;
  // Data used when the page is shared in social media services
  const openGraph = validProps(socialSharing, fieldOptions);
  // We add OpenGraph image as schema image if it exists.
  const schemaImage = openGraph?.images1200?.[0]?.url;
  const schemaImageMaybe = schemaImage ? { image: [schemaImage] } : {};
  const isArticle = ['Article', 'NewsArticle', 'TechArticle'].includes(schemaType);
  const schemaHeadlineMaybe = isArticle ? { headline: title } : {};

  // Schema for search engines (helps them to understand what this page is about)
  // http://schema.org (This template uses JSON-LD format)
  //
  // In addition to this schema data for search engines, src/components/Page/Page.js adds some extra schemas
  // Read more about schema:
  // - https://schema.org/
  // - https://developers.google.com/search/docs/advanced/structured-data/intro-structured-data
  const pageSchemaForSEO = {
    '@context': 'http://schema.org',
    '@type': schemaType || 'WebPage',
    description: description,
    name: title,
    ...schemaHeadlineMaybe,
    ...schemaImageMaybe,
  };

  return {
    title,
    description,
    schema: pageSchemaForSEO,
    socialSharing: openGraph,
  };
};

const LoadingSpinner = () => {
  return (
    <div className={css.loading}>
      <IconSpinner delay={600} />
    </div>
  );
};

//////////////////
// Page Builder //
//////////////////

/**
 * PageBuilder can be used to build content pages using page-asset.json.
 *
 * Note: props can include a lot of things that depend on
 * - pageAssetsData: json asset that contains instructions how to build the page content
 *   - asset should contain an array of _sections_, which might contain _fields_ and an array of _blocks_
 *     - _blocks_ can also contain _fields_
 * - fallbackPage: component. If asset loading fails, this is used instead.
 * - options: extra mapping of 3 level of sub components
 *   - sectionComponents: { ['my-section-type']: { component: MySection } }
 *   - blockComponents: { ['my-component-type']: { component: MyBlock } }
 *   - fieldComponents: { ['my-field-type']: { component: MyField, pickValidProps: data => Number.isInteger(data.content) ? { content: data.content } : {} }
 *     - fields have this pickValidProps as an extra requirement for data validation.
 * - pageProps: props that are passed to src/components/Page/Page.js component
 *
 * @param {Object} props
 * @returns page component
 */
const PageBuilder = props => {
  const {
    pageAssetsData,
    inProgress,
    error,
    fallbackPage,
    schemaType,
    options,
    currentPage,
    hideMobileBackButton,
    refreshData,
    ...pageProps
  } = props;
  const [selectedCategory, setSelectedCategory] = useState(null);
  const history = useHistory();
  const assetName = props?.assetName;
  const excludePullToRefresh = assetName !== 'landing-page' && assetName !== 'cms-page';
  const resistance = assetName === 'landing-page' ? 4 : 1.5;
  const pullDownThreshold = assetName === 'landing-page' ? 75 : 67;

  const handleCategorySelect = (categoryParams) => {
    setSelectedCategory(categoryParams.pub_categoryLevel1);
    // Navigate to search page with the selected category
    history.push(`/s?${new URLSearchParams(categoryParams).toString()}`);
  };

  if (!pageAssetsData && fallbackPage && !inProgress && error) {
    return fallbackPage;
  }

  // Page asset contains UI info and metadata related to it.
  // - "sections" (data that goes inside <body>)
  // - "meta" (which is data that goes inside <head>)
  const { sections = [], meta = {} } = pageAssetsData || {};
  const pageMetaProps = getMetadata(meta, schemaType, options?.fieldComponents);

  const layoutAreas = `
    topbar
    main
    footer
  `;

  const finalHideMobileBackButton = hideMobileBackButton ? hideMobileBackButton : false;

  return (
    <StaticPage {...pageMetaProps} {...pageProps}>
      <LayoutComposer areas={layoutAreas} className={css.layout}>
        {props => {
          const { Topbar, Main, Footer } = props;
          return (
            <>
              <Topbar as="header" className={css.topbar}>
                <TopbarContainer
                  currentPage={currentPage}
                  hideMobileBackButton={finalHideMobileBackButton}
                />
              </Topbar>
              <Main as="main" className={css.main}>
                {sections.length === 0 && inProgress ? (
                  <LoadingSpinner />
                ) : (
                  <PullToRefresh
                    refreshData={refreshData}
                    excludePullToRefresh={excludePullToRefresh}
                    resistance={resistance}
                    pullDownThreshold={pullDownThreshold}
                  >
                    {assetName === 'landing-page' && <LandingPageHeroSection />}

                    {Capacitor.isNativePlatform() && assetName === 'landing-page' && (
                      <IconSearchFilter
                        selected={selectedCategory}
                        onSelect={handleCategorySelect}
                      />
                    )}

                    <SectionBuilder assetName={assetName} sections={sections} options={options} />
                  </PullToRefresh>
                )}
              </Main>
              <Footer>
                <NativeBottomNavbar />
                <FooterContainer />
              </Footer>
            </>
          );
        }}
      </LayoutComposer>
    </StaticPage>
  );
};

export { LayoutComposer, StaticPage, SectionBuilder };

export default PageBuilder;

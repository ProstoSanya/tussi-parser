const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const url = 'https://www.tus.si/';
const jsonDir = `${__dirname}/json`;
const downloadDir = `${__dirname}/downloads`;

(async () => {
  let browser;
  try {
    await fs.promises.mkdir(jsonDir, {recursive: true});
    await fs.promises.mkdir(downloadDir, {recursive: true});
  
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const catalogueSection = await page.waitForSelector('.section-catalogue-and-magazines .slick-slider');
    const catalogues = await catalogueSection.evaluate((section) => {
      const catalogues = [];
      const items = section.querySelectorAll('li');
      for (let i = 0; i < items.length; ++i) {
        const catalogue = {};
        catalogue.name = items[i].querySelector('h3 > a')?.innerText || '';
        const links = items[i].querySelectorAll('figcaption a');
        if (links.length > 1) {
          catalogue.url = links[1]?.href || '';
        }
        catalogue.period = items[i].querySelector('p > time')?.parentNode?.innerText || '';
        catalogues.push(catalogue);
      }
      return Promise.resolve(catalogues);
    });
  
    if (catalogues.length) {
      await fs.promises.writeFile(`${jsonDir}/catalogues-${Date.now()}.json`, JSON.stringify(catalogues));  
      for (const catalogue of catalogues) {
        if (catalogue.url) {
          const fileName = `${catalogue.name}-${Date.now()}.pdf`;
          const res = await axios.get(catalogue.url, {responseType: 'arraybuffer'});
          await fs.promises.writeFile(`${downloadDir}/${fileName}`, res.data);
        }
      }
      console.info(`Successfully downloaded ${catalogues.length} catalogues.`);
    } else {
      console.warn('No catalogue was found.');
    }
  } catch (err) {
    console.error('Failed to get catalogues data.', err);
  } finally {
    (browser && await browser.close());
  }
})();
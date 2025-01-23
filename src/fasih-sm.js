import cheerio from 'cheerio';
import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

puppeteerExtra.use(StealthPlugin());

const FILE_PATH = 'data/dataSakernas.csv';
const USERNAME = 'yudistiraelton';
const PASSWORD = 'eltonelton';

async function saveDataToCSV(data) {
  const csvLines = data.map(row => row.join(';')).join('\n');
  await fs.writeFile(FILE_PATH, csvLines, 'utf-8');
  console.log('Data saved to data.csv');
}

const getFasihSmData = async () => {
  const browser = await puppeteerExtra.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://fasih-sm.bps.go.id/');
    await page.click('a.login-button');
    await page.evaluate(() => location.reload(true));
    await page.waitForNavigation();
    
    await page.type('#username', USERNAME, { delay: 100 });
    await page.type('#password', PASSWORD, { delay: 100 });
    await page.click('#kc-login');
    await page.waitForNavigation();
    
    await page.waitForSelector('a[href="/survey-collection/general/e777b17c-d6b6-4eee-bff6-933bbf6f4712"]');
    await page.click('a[href="/survey-collection/general/e777b17c-d6b6-4eee-bff6-933bbf6f4712"]');
    await page.evaluate(() => location.reload(true));

    let data = [];
    const jumlahHalaman = 2;

    for (let i = 1; i <= jumlahHalaman; i++) {
      await page.waitForSelector('#assignmentDatatable');
      await page.waitForFunction(() => document.querySelector('#assignmentDatatable tbody tr td'));
      await page.waitForSelector('select[name="assignmentDatatable_length"]');
      await page.select('select[name="assignmentDatatable_length"]', '100');

      await page.evaluate(async () => {
        await new Promise((resolve) => {
          const timer = setInterval(() => {
            window.scrollBy(0, 100);
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight) {
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      });

      const pageData = await page.evaluate(() => {
        const rows = document.querySelectorAll('#assignmentDatatable tr');
        return Array.from(rows, row => 
          Array.from(row.querySelectorAll('td'), col => col.innerText.trim())
        );
      });

      data = data.concat(pageData);

      if (i < jumlahHalaman) {
        await page.click('#assignmentDatatable_next');
        await page.evaluate(() => window.scrollTo(0, 0));
      }
    }

    console.log(`Data length: ${data.length}`);
    console.log(data.length === 154 ? 'Successfully retrieved all data' : 'Failed to retrieve all data');

    await saveDataToCSV(data);
    return data;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
};

const dataBotCleaning = async (data) => {
  for (const row of data) {
    if (row[0] === '' && row[10] === '') {
      try {
        const response = await axios.get(
          `https://script.google.com/macros/s/${process.env.API_KEY}`,
          {
            params: {
              action: 'save-scrap-bot',
              id: uuidv4(),
              category: 'SAKERNAS',
              variabel1: row[1],
              variabel2: row[2],
              variabel3: row[3],
              variabel4: row[4],
              variabel5: row[5],
              variabel6: row[6],
              variabel7: row[7],
              variabel8: row[8],
            },
          }
        );
        console.log(response.data);
      } catch (error) {
        console.error('API Error:', error);
      }
    }
  }
};
getFasihSmData();
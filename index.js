import puppeteer from 'puppeteer';
import credentials from './credentials.json'  assert { type: 'json' };;

function pause(milisecondsTime) {
    return new Promise(resolve => setTimeout(resolve, milisecondsTime));
}

function randomTime(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const pauseTime = randomTime(1500, 3000);

async function scrollAndClickLoadMore(page) {
    let loadMoreVisible = await page.evaluate(() => {
        const loadMoreButton = document.querySelector('button.comments-comments-list__load-more-comments-button');
        if (loadMoreButton) {
            loadMoreButton.scrollIntoView();
            return true;
        }
        return false;
    });

    if (loadMoreVisible) {
        await pause(pauseTime);
        await page.click('button.comments-comments-list__load-more-comments-button');
        // Espera até que o botão de carregar mais comentários não esteja mais presente
        await page.waitForFunction(
            () => !document.querySelector('button.comments-comments-list__load-more-comments-button'),
            { timeout: 10000 }
        ).catch(e => console.log("Timeout esperando o botão 'Carregar mais comentários' desaparecer"));
        await pause(pauseTime);
        await scrollAndClickLoadMore(page);
    }
}

(async () => {
    console.log('\n\n\n>>>>>>>>>>>>>>>>>>>>>>> COLETA DE DADOS INICIADA! <<<<<<<<<<<<<<<<<<<<<<<');
    console.log('>>>>>>>>>>>>>>>> NÃO FECHE ESTA JANELA OU PRESSIONE CTRL + C <<<<<<<<<<<<<<<<<<');
    console.log('\nAguarde enquanto os dados são coletados...');
    console.log('\n ### SE SEU LINKEDIN TIVER AUTENTICAÇÃO DE DOIS FATORES CONFIRME NO SEU SMARTPHONE ###');

    const startDate = new Date();

    const intervalId = setInterval(() => {
        const now = new Date();
        const elapsed = new Date(now - startDate);
        const hours = elapsed.getUTCHours().toString().padStart(2, '0');
        const minutes = elapsed.getUTCMinutes().toString().padStart(2, '0');
        const seconds = elapsed.getUTCSeconds().toString().padStart(2, '0');

        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(`Tempo de execução: ${hours}:${minutes}:${seconds}`);
    }, 1000);

    const browser = await puppeteer.launch({ headless: true });

    let URL_BASE = 'https://www.linkedin.com';
    let URL = `${URL_BASE}/feed/update/urn:li:activity:7181867806068457472?utm_source=share&utm_medium=member_desktop`;

    const page = await browser.newPage();

    await page.goto(URL);

    try {
        await page.evaluate(() => {
            return new Promise((resolve) => {
                let linkSignIn = document.querySelector('a.main__sign-in-link');
                if (linkSignIn) {
                    setTimeout(() => {
                        linkSignIn.click();
                        resolve();
                    }, 2500);
                } else {
                    resolve();
                }
            });
        });
    } catch (error) {
        console.log('\n\nModal de login não encontrado: ', error);
    }

    try {
        await pause(pauseTime);
        await page.waitForSelector('input#username', { visible: true });

        await pause(pauseTime);
        await page.type('input#username', credentials.username, { delay: 150 });
        await pause(pauseTime);
        await page.type('input#password', credentials.password, { delay: 150 });

        await page.click('div.login__form_action_container button.btn__primary--large');

    } catch (error) {
        console.log('\n\nOcorreu um erro ao tentar fazer o login: ', error);
    }

    try {
        await page.waitForSelector('div.comments-comments-list    ', { visible: true });

        await pause(pauseTime);

        await scrollAndClickLoadMore(page);

        await pause(pauseTime);

        let listNumbers = await page.evaluate(() => {
            const nodeElements = document.querySelectorAll('.comments-comments-list    ')[0].getElementsByTagName('article');
            const commentsList = [...nodeElements];
            let commentNumbersList = [];

            for (let index = 0; index < commentsList.length; index++) {
                let commentNumbers = commentsList[index].childNodes[8].innerText;
                const pattern = /\b\d{4}\s*,?\s*\d{4}\s*,?\s*\d{4}\b/g;

                let matches = commentNumbers.match(pattern);

                if (matches) {
                    commentNumbersList.push(...matches);
                }
            }

            return commentNumbersList.flatMap(item => item);
        });

        console.log('\n\nNÚMEROS JÁ INFORMADOS: ', listNumbers);

        function generateUniqueNumbers(excludedNumbers) {
            const uniqueNumbers = new Set();
            while (uniqueNumbers.size < 3) {
                // Gera um número de 4 dígitos como string, mantendo os zeros à esquerda
                const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
                if (!excludedNumbers.includes(randomNumber)) {
                    uniqueNumbers.add(randomNumber);
                }
            }
            return [...uniqueNumbers].join(', ');
        }

        const uniqueNumbers = generateUniqueNumbers(listNumbers);
        console.log('\n\nSEUS NÚMEROS DA SORTE: ', uniqueNumbers);
        console.log('\n\nBOA SORTE!\n\n');

    } catch (error) {
        console.log('\n\nOcorreu um erro ao tentar obter os comentários: ', error);
    }

    clearInterval(intervalId); //Para o timer

    await browser.close();

})();

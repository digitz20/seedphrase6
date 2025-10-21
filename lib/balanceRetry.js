async function getBalanceWithRetry(currency, address, maxRetries = 3) {
    let lastError;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
        try {
            const provider = providerRotation.getNextProvider(currency);
            if (!provider) {
                await sleep(5000); // Wait if all providers are in cooldown
                continue;
            }

            const result = await getBalance(currency, address, provider);
            return result;
        } catch (error) {
            lastError = error;
            retryCount++;

            if (error.status === 429) {
                // Rate limit hit - put provider in cooldown
                const cooldownTime = parseInt(error.headers?.get('retry-after') || '60', 10) * 1000;
                providerRotation.setCooldown(currency, provider.name, cooldownTime);
                continue;
            }

            // Exponential backoff for other errors
            await sleep(Math.min(1000 * Math.pow(2, retryCount), 30000));
        }
    }

    throw lastError;
}

module.exports = { getBalanceWithRetry };
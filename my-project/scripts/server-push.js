const fetchMons = require('../server/lib/map');
const webpush = require('../server/lib/webpush');
const mongoClient = require('../server/lib/mongo');
const SubscriptionModel = require('../server/models/sub');
// const sleep = require('system-sleep');

async function init (source = '') {
	console.log('[SERVER PUSH]');

	await mongoClient;
	const dataJSON = await SubscriptionModel.find();

	for (let sub of dataJSON) {

		const pushSubscription = sub.subscription;

		// TODO if duplicate locations (or close enough) fire off a single request
		const mons = await fetchMons(sub.radius, sub.mons, sub.location);

		if (mons) {
			console.log('[SERVER PUSH] uuid', sub._id);
			console.log('[SERVER PUSH] mons fetched:', mons);

			for (const key in mons) {
				if (mons.hasOwnProperty(key)) {
					const foundMon = mons[key];
					console.log(`[SERVER PUSH] notifying ${sub._id} about ${JSON.stringify(mons[key])}`);

					const payload = {
						title: `${foundMon.name} ${source}`,
						icon: `img/${foundMon.id}.png`,
						message: JSON.stringify({
							location: foundMon.location,
							myLocation: sub.location,
							text: `${foundMon.distance}m away for ${foundMon.despawn} more minutes`
						})
					};

					await webpush.send(pushSubscription, payload);
				}
			}
		}
		else {
			const lauraMobile = sub._id === process.env.LAURA_MOBILE_UUID;

			// if blacklisted invoke the lambda for this ONE person
			// wait/sleep happens here https://stackoverflow.com/questions/33659059/invoke-amazon-lambda-function-from-node-app
			// don't invoke the lambda if we're already in the lambda \o/
			// share 100% of the code

			if (lauraMobile) {
				console.log('[SERVER PUSH] sending blacklist push', sub._id);
				await webpush.send(pushSubscription, {
					icon: 'img/blacklist.png',
					title: 'Mon Radar',
					message: JSON.stringify({
						text: 'Heroku IP blacklisted. Stand by... 💀'
					})
				});
			}
		}

		console.log('[SERVER PUSH] sleeping for 1s');
		// sleep(1000); // 1 seconds
	}
}

module.exports = init;

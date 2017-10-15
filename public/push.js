const applicationServerPublicKey = 'BOEwwTyknxDzuCzEEhZEj4Gu0P0ZnwBbhgaxRVIdwvhEhTpw68lAHXuNPqTvrIH6l2ONFbs4SVOP6SjswWB7bQ0';

let isSubscribed = false;
let swRegistration = null;

const pushButton = document.querySelector('#update-push');
const submitButton = document.querySelector('#submit');
const pushStatus = document.querySelector('#push-status');
const subsInfo = document.querySelector('#subs-info');

function urlB64ToUint8Array (base64String) {
	const padding = '='.repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
		.replace(/\-/g, '+')
		.replace(/_/g, '/');

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}
	return outputArray;
}

function updateBtn () {
  if (Notification.permission === 'denied') {
    pushButton.textContent = 'Push Messaging Blocked.';
    pushButton.disabled = true;
    updateSubscriptionOnServer(null);
    return;
  }

  if (isSubscribed) {
    pushButton.textContent = 'Disable Push';
    submitButton.disabled = false;
    pushStatus.innerHTML = '✅ Push is enabled';
    subsInfo.innerHTML = 'You may subscribe to Pokémon notifications';
  } else {
    pushButton.textContent = 'Enable Push';
    submitButton.disabled = true;
    pushStatus.innerHTML = '🚫 Push is disabled';
    subsInfo.innerHTML = 'Please enable push to subscribe to Pokémon notifications';
  }

  pushButton.disabled = false;
}

function updateSubscriptionOnServer (subscription) {
	console.log('sending subs to server', JSON.stringify(subscription, null, 2));

	fetch('/api/subscribe', {
		method: 'POST',
		headers: {
			'content-type': 'application/json'
		},
		credentials: 'same-origin',
		timeout: 2000,
		body: subscription ? JSON.stringify(subscription) : subscription
	})
	.catch(e => {console.error(e);});
}

function subscribeUser () {
	const applicationServerKey = urlB64ToUint8Array(applicationServerPublicKey);
	swRegistration.pushManager.subscribe({
		userVisibleOnly: true,
		applicationServerKey: applicationServerKey
	})
	.then(function (subscription) {
		console.log('User is subscribed.');

		updateSubscriptionOnServer(subscription);

		isSubscribed = true;
    	updateBtn();
	})
	.catch(function (err) {
		console.log('Failed to subscribe the user: ', err);
		updateBtn();
	});
}

function unsubscribeUser () {
	swRegistration.pushManager.getSubscription()
	.then(function (subscription) {
		if (subscription) {
			return subscription.unsubscribe();
		}
	})
	.catch(function (error) {
		console.log('Error unsubscribing', error);
	})
	.then(function () {
		updateSubscriptionOnServer(null);

		console.log('User is unsubscribed.');
		isSubscribed = false;
		updateBtn();
	});
}

function initialiseUI () {

	pushButton.addEventListener('click', function () {
	  pushButton.disabled = true;
	  if (isSubscribed) {
	    unsubscribeUser();
	  } else {
	    subscribeUser();
	  }
	});

	// Set the initial subscription value
	swRegistration.pushManager.getSubscription()
	.then(function (subscription) {
		isSubscribed = !(subscription === null);

		if (isSubscribed) {
			console.log('User IS subscribed.');
		} else {
			console.log('User is NOT subscribed.');
		}
		updateBtn();
	});
}

if ('serviceWorker' in navigator && 'PushManager' in window) {
	console.log('Service Worker and Push is supported');

	navigator.serviceWorker.register('sw.js')
	.then(function (swReg) {
		console.log('Service Worker is registered', swReg);

		swRegistration = swReg;
		initialiseUI();
	})
	.catch(function (error) {
		console.error('Service Worker Error', error);
	});
} else {
	console.warn('Push messaging is not supported');
	pushButton.textContent = 'Push Not Supported';
}

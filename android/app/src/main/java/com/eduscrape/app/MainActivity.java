package com.eduscrape.app;

import android.os.Bundle;
import android.content.IntentSender;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.util.Log;

import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.appupdate.AppUpdateInfo;
import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;

public class MainActivity extends BridgeActivity {
	private static final String TAG = "MainActivity";
	private static final int APP_UPDATE_REQUEST_CODE = 1001;
	private AppUpdateManager appUpdateManager;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		if (getBridge() != null) {
			WebView webView = getBridge().getWebView();
			if (webView != null) {
				WebSettings settings = webView.getSettings();
				settings.setSupportZoom(false);
				settings.setBuiltInZoomControls(false);
				settings.setDisplayZoomControls(false);
				settings.setLoadWithOverviewMode(true);
				settings.setUseWideViewPort(true);
			}
		}

		appUpdateManager = AppUpdateManagerFactory.create(this);
		checkForAppUpdate();
	}

	@Override
	protected void onResume() {
		super.onResume();
		checkForAppUpdate();
	}

	private void checkForAppUpdate() {
		if (appUpdateManager == null) {
			return;
		}

		appUpdateManager
			.getAppUpdateInfo()
			.addOnSuccessListener(this::handleAppUpdateInfo)
			.addOnFailureListener(exception -> Log.w(TAG, "Failed to check for app updates", exception));
	}

	private void handleAppUpdateInfo(AppUpdateInfo appUpdateInfo) {
		if (appUpdateInfo.installStatus() == InstallStatus.DOWNLOADED) {
			appUpdateManager
				.completeUpdate()
				.addOnSuccessListener(unused -> Log.i(TAG, "App update completed"))
				.addOnFailureListener(exception -> Log.w(TAG, "Failed to complete app update", exception));
			return;
		}

		boolean isUpdateAvailable = appUpdateInfo.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE;
		boolean isUpdateInProgress = appUpdateInfo.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS;
		boolean canUseImmediate = appUpdateInfo.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE);

		if ((isUpdateAvailable || isUpdateInProgress) && canUseImmediate) {
			try {
				appUpdateManager.startUpdateFlowForResult(
					appUpdateInfo,
					this,
					AppUpdateOptions.newBuilder(AppUpdateType.IMMEDIATE).build(),
					APP_UPDATE_REQUEST_CODE
				);
			} catch (IntentSender.SendIntentException exception) {
				Log.w(TAG, "Failed to start app update flow", exception);
			}
		}
	}
}

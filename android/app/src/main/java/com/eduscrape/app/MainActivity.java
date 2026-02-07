package com.eduscrape.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
				settings.setLoadWithOverviewMode(false);
				settings.setUseWideViewPort(false);
				webView.setInitialScale(100);
			}
		}
	}
}

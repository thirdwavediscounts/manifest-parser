var C=Object.defineProperty;var M=(n,t,e)=>t in n?C(n,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):n[t]=e;var h=(n,t,e)=>M(n,typeof t!="symbol"?t+"":t,e);import{s as N,M as A}from"./detector-Bh9ZqayP.js";function S(){const n=x();return{retailer:n.retailer,listingName:n.listingName,auctionEndTime:n.auctionEndTime,manifestUrl:null,manifestData:null,manifestType:null}}async function B(){const n=x(),t=await D();return{retailer:n.retailer,listingName:n.listingName,auctionEndTime:n.auctionEndTime,manifestUrl:null,manifestData:t.data,manifestType:t.type}}async function D(){return console.log("[ManifestParser] Looking for download manifest button..."),new Promise(n=>{const t=`manifest-parser-blob-${Date.now()}`,e=s=>{const o=s;if(window.removeEventListener(t,e),o.detail){console.log("[ManifestParser] Received blob data from page");const r=R(o.detail.type);n({data:o.detail.data,type:r})}else console.log("[ManifestParser] No blob captured"),n({data:null,type:null})};window.addEventListener(t,e);const a=document.createElement("script");a.textContent=`
      (function() {
        const eventName = '${t}';
        const originalCreateObjectURL = URL.createObjectURL;
        let capturedBlob = null;
        let cleanupCalled = false;

        // Intercept URL.createObjectURL
        URL.createObjectURL = function(obj) {
          if (obj instanceof Blob) {
            console.log('[ManifestParser:Injected] Intercepted blob:', obj.type, obj.size);
            capturedBlob = obj;
          }
          return originalCreateObjectURL.call(URL, obj);
        };

        const cleanup = async () => {
          if (cleanupCalled) return;
          cleanupCalled = true;

          URL.createObjectURL = originalCreateObjectURL;

          if (capturedBlob) {
            // Convert blob to base64
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result;
              const base64Data = base64.split(',')[1] || base64;
              window.dispatchEvent(new CustomEvent(eventName, {
                detail: { data: base64Data, type: capturedBlob.type }
              }));
            };
            reader.onerror = () => {
              window.dispatchEvent(new CustomEvent(eventName, { detail: null }));
            };
            reader.readAsDataURL(capturedBlob);
          } else {
            window.dispatchEvent(new CustomEvent(eventName, { detail: null }));
          }
        };

        // Set timeout
        const timeoutId = setTimeout(() => {
          console.log('[ManifestParser:Injected] Download timeout');
          cleanup();
        }, 5000);

        // Watch for blob capture
        const checkInterval = setInterval(() => {
          if (capturedBlob) {
            clearInterval(checkInterval);
            clearTimeout(timeoutId);
            setTimeout(cleanup, 500);
          }
        }, 100);

        // Find and click the download button
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"]'));
        const downloadKeywords = ['download manifest', 'full manifest', 'download full manifest'];

        for (const btn of buttons) {
          const text = (btn.textContent || '').toLowerCase().trim();
          for (const keyword of downloadKeywords) {
            if (text.includes(keyword)) {
              console.log('[ManifestParser:Injected] Clicking button:', text);
              btn.click();
              return;
            }
          }
        }

        // No button found
        console.log('[ManifestParser:Injected] No download button found');
        cleanup();
      })();
    `,document.documentElement.appendChild(a),a.remove()})}function R(n){const t=n.toLowerCase();return t.includes("csv")||t.includes("text/plain")||t===""?"csv":t.includes("spreadsheetml")||t.includes("xlsx")?"xlsx":t.includes("ms-excel")||t.includes("xls")?"xls":"csv"}function x(){var t,e,a,s,o,r,i,l,d;try{const u=document.getElementById("__NEXT_DATA__");if(u){const m=JSON.parse(u.textContent||"{}"),p=(e=(t=m==null?void 0:m.props)==null?void 0:t.pageProps)==null?void 0:e.dehydratedState,f=((p==null?void 0:p.queries)||[]).find(c=>JSON.stringify(c.queryKey).includes("listing"));if((a=f==null?void 0:f.state)!=null&&a.data){const c=f.state.data,T=((o=(s=c.seller)==null?void 0:s.storefront)==null?void 0:o.name)||((i=(r=c.seller)==null?void 0:r.account)==null?void 0:i.displayName)||b()||y(),E=c.title||c.name||g(),v=c.auctionEndTime||c.endTime||c.closingTime||((l=c.auction)==null?void 0:l.endTime)||((d=c.auction)==null?void 0:d.closingTime)||null;return{retailer:T,listingName:E,auctionEndTime:v}}}}catch(u){console.debug("[ManifestParser] Failed to extract from Next.js data:",u)}const n=b();return n?{retailer:n,listingName:g(),auctionEndTime:w()}:{retailer:y(),listingName:g(),auctionEndTime:w()}}function b(){const t=window.location.href.toLowerCase().match(/\/([a-z0-9-]+)\/auction\//);if(t){const e=t[1];if(!["buy","sell","about","help","login"].includes(e))return U(e)}return null}function U(n){const t={qvc:"QVC",bayer:"Bayer",acehardware:"Ace Hardware","ace-hardware":"Ace Hardware",jcpenney:"JCPenney",target:"Target",costco:"Costco",walmart:"Walmart",homedepot:"Home Depot","home-depot":"Home Depot",lowes:"Lowes",bestbuy:"Best Buy","best-buy":"Best Buy",macys:"Macys",nordstrom:"Nordstrom",kohls:"Kohls"},e=n.toLowerCase();return t[e]||n.charAt(0).toUpperCase()+n.slice(1)}function w(){const n=['[data-testid*="end"]','[class*="countdown"]','[class*="timer"]','[class*="end-time"]','[class*="closing"]'];for(const t of n){const e=document.querySelector(t);if(e!=null&&e.textContent){const s=e.textContent.trim().match(/(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/);if(s)try{const o=new Date(s[1]);if(!isNaN(o.getTime()))return o.toISOString()}catch(o){console.debug("[ManifestParser] Failed to parse date:",s[1],o)}}}return null}function y(){const n=document.title.split("|");if(n.length>=2){const e=n[n.length-1].trim().replace(/\s*Liquidation\s*$/i,"").replace(/\s*Auctions?\s*$/i,"").replace(/\s*B-Stock\s*$/i,"").trim();if(e.length>0&&e.length<50)return e}return"B-Stock"}function g(){const n=document.title.split("|");if(n.length>=1){const t=n[0].trim();if(t.length>0&&t.length<200)return t}return"Listing"}function k(){chrome.runtime.onMessage.addListener((n,t,e)=>n.type==="EXTRACT_LISTING_DATA"?(console.log("[ManifestParser] Extracting listing data from:",window.location.href),B().then(a=>{console.log("[ManifestParser] Extracted data:",a),e({type:"LISTING_DATA_RESULT",payload:a})}).catch(a=>{console.error("[ManifestParser] Error extracting data:",a);const s=S();e({type:"LISTING_DATA_RESULT",payload:s})}),!0):!1)}class P extends A{constructor(){super(...arguments);h(this,"siteName","bstock");h(this,"urlPatterns",[/bstock\.com/i,/bstockauctions\.com/i,/bstocksolutions\.com/i])}detectManifests(){const e=[];return e.push(...this.findManifestLinks()),e.push(...this.findBstockManifestButtons()),e.push(...this.findLotManifests()),this.deduplicateManifests(e)}isAuthenticated(){const e=document.querySelector('a[href*="logout"], a[href*="signout"]')!==null,a=document.querySelector('.account-menu, .user-menu, [class*="account"]')!==null,s=document.cookie.includes("session")||document.cookie.includes("auth");return e||a||s}findBstockManifestButtons(){const e=[];return document.querySelectorAll('a[href*="manifest"], button[data-manifest], [class*="manifest-download"], [class*="download-manifest"]').forEach(o=>{if(o instanceof HTMLAnchorElement&&o.href){const r=this.guessTypeFromUrl(o.href)||"csv";e.push({url:o.href,filename:this.extractFilename(o.href,r),type:r})}}),document.querySelectorAll("a").forEach(o=>{var i;const r=((i=o.textContent)==null?void 0:i.toLowerCase())||"";if((r.includes("manifest")||r.includes("item list")||r.includes("inventory"))&&o.href&&!o.href.startsWith("javascript:")){const l=this.guessTypeFromUrl(o.href)||"csv";e.push({url:o.href,filename:this.extractFilename(o.href,l),type:l})}}),e}findLotManifests(){const e=[];return document.querySelectorAll('.lot-details, .auction-details, [class*="lot-info"], [class*="manifest-section"]').forEach(s=>{s.querySelectorAll("a[href]").forEach(r=>{var d;const i=r.href,l=((d=r.textContent)==null?void 0:d.toLowerCase())||"";if(i.includes(".csv")||i.includes(".xlsx")||i.includes(".xls")||l.includes("download")||l.includes("manifest")){const u=this.guessTypeFromUrl(i)||"csv";e.push({url:i,filename:this.extractFilename(i,u),type:u})}})}),e}}const L=new P;L.matches(window.location.href)&&(N(L),k());

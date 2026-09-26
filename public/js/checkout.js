/**
 * Pico Picks Dedicated Checkout & PDF Invoice Controller
 * Handles Selective Cart Synchronization, Bangladesh Cascading Locations (8 Divisions, 64 Districts, Thanas),
 * Dynamic Shipping Charge Sync (Inside Chattogram ৳70 vs Outside Chattogram ৳130),
 * Mandatory Cash on Delivery (COD) Advance Delivery Charge Condition & Verification,
 * Coupon Application, Tax Removal, Order Creation, and PDF Invoice Generation.
 */

const CART_STORAGE_KEY = 'pico_cart';

// Complete Mapping of Bangladesh: 8 Divisions -> 64 Districts -> Thanas / Upazilas
const BD_LOCATIONS = {
    "Chattogram": {
        "Chattogram": [
            "Kotwali", "Panchlaish", "Pahartali", "Halishahar", "Chandgaon", 
            "Double Mooring", "Bayezid", "Khulshi", "Patenga", "Bakalia", 
            "Karnaphuli", "Akbar Shah", "Chawkbazar", "Sadarganj", "EPZ",
            "Hathazari", "Raozan", "Rangunia", "Sitakunda", "Mirsharai", 
            "Patiya", "Boalkhali", "Anwara", "Chandanaish", "Banshkhali", 
            "Lohagara", "Satkania", "Sandwip", "Fatikchhari"
        ],
        "Cox's Bazar": ["Cox's Bazar Sadar", "Chakaria", "Maheshkhali", "Teknaf", "Ukhia", "Ramu", "Pekua", "Kutubdia", "Eidgaon"],
        "Cumilla": ["Cumilla Adarsha Sadar", "Cumilla Sadar Dakshin", "Barura", "Brahmanpara", "Burichang", "Chandina", "Chauddagram", "Daudkandi", "Debidwar", "Homna", "Laksam", "Muradnagar", "Meghna", "Monohargonj", "Titas"],
        "Feni": ["Feni Sadar", "Chhagalnaiya", "Daganbhuiyan", "Parshuram", "Fulgazi", "Sonagazi"],
        "Brahmanbaria": ["Brahmanbaria Sadar", "Ashuganj", "Nasirnagar", "Nabinagar", "Sarail", "Kasba", "Akhaura", "Bancharampur", "Bijoynagar"],
        "Noakhali": ["Noakhali Sadar (Sudharam)", "Begumganj", "Chatkhil", "Companiganj", "Hatiya", "Senbagh", "Sonaimuri", "Subarnachar", "Kabirhat"],
        "Chandpur": ["Chandpur Sadar", "Faridganj", "Haimchar", "Haziganj", "Kachua", "Matlab Dakshin", "Matlab Uttar", "Shahrasti"],
        "Lakshmipur": ["Lakshmipur Sadar", "Raipur", "Ramganj", "Ramgati", "Kamalnagar"],
        "Rangamati": ["Rangamati Sadar", "Kaptai", "Baghaichhari", "Barkal", "Belaichhari", "Juraichhari", "Langadu", "Naniarchar", "Rajasthali"],
        "Khagrachhari": ["Khagrachhari Sadar", "Dighinala", "Lakshmichhari", "Mahalchhari", "Manikchhari", "Matiranga", "Panchhari", "Ramgarh", "Guimara"],
        "Bandarban": ["Bandarban Sadar", "Alikadam", "Lama", "Naikhongchhari", "Rowangchhari", "Ruma", "Thanchi"]
    },
    "Dhaka": {
        "Dhaka": [
            "Dhanmondi", "Gulshan", "Banani", "Mirpur", "Mohammadpur", 
            "Uttara", "Motijheel", "Tejgaon", "Ramna", "Shahbagh", 
            "Badda", "Khilgaon", "Paltan", "Lalbagh", "Sutrapur", 
            "Demra", "Jatrabari", "New Market", "Hazaribagh", "Kafrul", 
            "Cantonment", "Khilkhet", "Vatara", "Rampura", "Savar", 
            "Dhamrai", "Keraniganj", "Dohar", "Nawabganj"
        ],
        "Gazipur": ["Gazipur Sadar", "Kaliakair", "Kaliganj", "Kapasia", "Sreepur", "Tongi"],
        "Narayanganj": ["Narayanganj Sadar", "Bandar", "Araihazar", "Rupganj", "Sonargaon"],
        "Tangail": ["Tangail Sadar", "Basail", "Bhuapur", "Delduar", "Ghatail", "Gopalpur", "Kalihati", "Madhupur", "Mirzapur", "Nagarpur", "Sakhipur", "Dhanbari"],
        "Kishoreganj": ["Kishoreganj Sadar", "Bajitpur", "Bhairab", "Hossainpur", "Itna", "Karimganj", "Katiadi", "Kuliarchar", "Mithamain", "Nikli", "Pakundia", "Tarail"],
        "Manikganj": ["Manikganj Sadar", "Singair", "Shivalaya", "Saturia", "Harirampur", "Ghior", "Daulatpur"],
        "Munshiganj": ["Munshiganj Sadar", "Tongibari", "Sirajdikhan", "Lohajang", "Sreenagar", "Gazaria"],
        "Narsingdi": ["Narsingdi Sadar", "Belabo", "Monohardi", "Palash", "Raipura", "Shibpur"],
        "Faridpur": ["Faridpur Sadar", "Alfadanga", "Bhangga", "Boalmari", "Charbhadrasan", "Madhukhali", "Nagarkanda", "Sadarpur", "Saltha"],
        "Gopalganj": ["Gopalganj Sadar", "Kashiani", "Kotalipara", "Muksudpur", "Tungipara"],
        "Madaripur": ["Madaripur Sadar", "Kalkini", "Rajoir", "Shibchar", "Dasar"],
        "Rajbari": ["Rajbari Sadar", "Baliakandi", "Goalandaghat", "Pangsha", "Kalukhali"],
        "Shariatpur": ["Shariatpur Sadar", "Bhedarganj", "Damudya", "Gosairhat", "Naria", "Zajira"]
    },
    "Rajshahi": {
        "Rajshahi": ["Boalia", "Motihar", "Rajpara", "Shah Mokdum", "Paba", "Bagha", "Bagmara", "Charghat", "Durgapur", "Godagari", "Mohanpur", "Puthia", "Tanore"],
        "Bogura": ["Bogura Sadar", "Adamdighi", "Dhunat", "Dhupchanchia", "Gabtali", "Kahaloo", "Nandigram", "Sariakandi", "Shajahanpur", "Sherpur", "Shibganj", "Sonatala"],
        "Pabna": ["Pabna Sadar", "Atgharia", "Bera", "Bhangura", "Chatmohar", "Faridpur", "Ishwardi", "Santhia", "Sujanagar"],
        "Sirajganj": ["Sirajganj Sadar", "Belkuchi", "Chauhali", "Kamarkhanda", "Kazipur", "Rayganj", "Shahjadpur", "Tarash", "Ullapara"],
        "Naogaon": ["Naogaon Sadar", "Atrai", "Badalgachhi", "Dhamoirhat", "Manda", "Mohadevpur", "Niamatpur", "Patnitala", "Porsha", "Raninagar", "Sapahar"],
        "Natore": ["Natore Sadar", "Bagatipara", "Baraigram", "Gurudaspur", "Lalpur", "Singra", "Naldanga"],
        "Chapainawabganj": ["Chapainawabganj Sadar", "Bholahat", "Gomastapur", "Nachole", "Shibganj"],
        "Joypurhat": ["Joypurhat Sadar", "Akkelpur", "Kalai", "Khetlal", "Panchbibi"]
    },
    "Khulna": {
        "Khulna": ["Khulna Sadar", "Sonadanga", "Khalishpur", "Daulatpur", "Khan Jahan Ali", "Batiaghata", "Dacope", "Dumuria", "Dighalia", "Koyra", "Paikgachha", "Phultala", "Rupsha", "Terokhada"],
        "Jashore": ["Jashore Sadar", "Abhaynagar", "Bagherpara", "Chaugachha", "Jhikargachha", "Keshabpur", "Manirampur", "Sharsha"],
        "Kushtia": ["Kushtia Sadar", "Bheramara", "Daulatpur", "Khoksa", "Kumarkhali", "Mirpur"],
        "Satkhira": ["Satkhira Sadar", "Assasuni", "Debhata", "Kalaroa", "Kaliganj", "Shyamnagar", "Tala"],
        "Bagerhat": ["Bagerhat Sadar", "Chitalmari", "Fakirhat", "Kachua", "Mollahat", "Mongla", "Morrelganj", "Rampal", "Sarankhola"],
        "Jhenaidah": ["Jhenaidah Sadar", "Harinakundu", "Kaliganj", "Kotchandpur", "Maheshpur", "Shailkupa"],
        "Chuadanga": ["Chuadanga Sadar", "Alamdanga", "Damurhuda", "Jibannagar"],
        "Meherpur": ["Meherpur Sadar", "Gangni", "Mujibnagar"],
        "Magura": ["Magura Sadar", "Mohammadpur", "Shalika", "Sreepur"],
        "Narail": ["Narail Sadar", "Kalia", "Lohagara"]
    },
    "Barishal": {
        "Barishal": ["Barishal Sadar (Kotwali)", "Agailjhara", "Babuganj", "Bakerganj", "Banaripara", "Gaurnadi", "Hizla", "Mehendiganj", "Muladi", "Wazirpur"],
        "Patuakhali": ["Patuakhali Sadar", "Bauphal", "Dashmina", "Galachipa", "Kalapara", "Mirzaganj", "Rangabali", "Dumki"],
        "Bhola": ["Bhola Sadar", "Burhanuddin", "Char Fasson", "Daulatkhan", "Lalmohan", "Manpura", "Tazumuddin"],
        "Pirojpur": ["Pirojpur Sadar", "Bhandaria", "Kawkhali", "Mathbaria", "Nazirpur", "Nesarabad (Swarupkati)", "Indurkani"],
        "Barguna": ["Barguna Sadar", "Amtali", "Bamna", "Betagi", "Patharghata", "Taltali"],
        "Jhalokathi": ["Jhalokathi Sadar", "Kathalia", "Nalchity", "Rajapur"]
    },
    "Sylhet": {
        "Sylhet": ["Sylhet Sadar", "Kotwali", "South Surma", "Beanibazar", "Bishwanath", "Companiganj", "Fenchuganj", "Golapganj", "Gowainghat", "Jaintiapur", "Kanaighat", "Zakiganj", "Osmani Nagar"],
        "Moulvibazar": ["Moulvibazar Sadar", "Barlekha", "Juri", "Kamalganj", "Kulaura", "Rajnagar", "Sreemangal"],
        "Habiganj": ["Habiganj Sadar", "Ajmiriganj", "Bahubal", "Baniachong", "Chunarughat", "Lakhai", "Madhabpur", "Nabiganj", "Sayestaganj"],
        "Sunamganj": ["Sunamganj Sadar", "Bishwamvarpur", "Chhatak", "Derai", "Dharampasha", "Dowarabazar", "Jagannathpur", "Jamalganj", "Shantiganj (South Sunamganj)", "Sullah", "Tahirpur", "Madhyanagar"]
    },
    "Rangpur": {
        "Rangpur": ["Rangpur Sadar", "Kotwali", "Badarganj", "Gangachhara", "Kaunia", "Mithapukur", "Pirgachha", "Pirganj", "Taraganj"],
        "Dinajpur": ["Dinajpur Sadar", "Birampur", "Birganj", "Biral", "Bochaganj", "Chirirbandar", "Fulbari", "Ghoraghat", "Hakimpur", "Kaharole", "Khansama", "Nawabganj", "Parbatipur"],
        "Kurigram": ["Kurigram Sadar", "Bhurungamari", "Char Rajibpur", "Chilmari", "Phulbari", "Nageshwari", "Rajarhat", "Raomari", "Ulipur"],
        "Gaibandha": ["Gaibandha Sadar", "Fulchhari", "Gobindaganj", "Palashbari", "Sadullapur", "Saghata", "Sundarganj"],
        "Nilphamari": ["Nilphamari Sadar", "Dimla", "Domar", "Jaldhaka", "Kishoreganj", "Saidpur"],
        "Panchagarh": ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj", "Tetulia"],
        "Thakurgaon": ["Thakurgaon Sadar", "Baliadangi", "Haripur", "Pirganj", "Ranisankail"],
        "Lalmonirhat": ["Lalmonirhat Sadar", "Aditmari", "Hatibandha", "Kaliganj", "Patgram"]
    },
    "Mymensingh": {
        "Mymensingh": ["Mymensingh Sadar", "Kotwali", "Bhaluka", "Dhobaura", "Fulbaria", "Gafargaon", "Gauripur", "Haluaghat", "Ishwarganj", "Muktagachha", "Nandail", "Phulpur", "Tara Khanda"],
        "Jamalpur": ["Jamalpur Sadar", "Bakshiganj", "Dewanganj", "Islampur", "Madarganj", "Melandaha", "Sarishabari"],
        "Netrokona": ["Netrokona Sadar", "Atpara", "Barhatta", "Durgapur", "Kalmakanda", "Kendua", "Madan", "Mohanganj", "Purbadhala", "Khaliajuri"],
        "Sherpur": ["Sherpur Sadar", "Jhenaigati", "Nakla", "Nalitabari", "Sreebardi"]
    }
};

const checkoutState = {
    currentUser: null,
    cartItems: [],
    subtotal: 0,
    discountAmount: 0,
    couponCode: '',
    tax: 0,
    deliveryArea: 'Inside Chattogram',
    shippingFee: 70.00,
    total: 0,
    selectedPayment: 'Cash on Delivery',
    currentOrder: null
};

// Security helper: prevent XSS in dynamic templates
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

/**
 * 1. Initialize Checkout Data & Location Dropdowns
 */
document.addEventListener('DOMContentLoaded', async () => {
    initLocationDropdowns();
    await checkUserSession();
    await loadCheckoutCart();
});

/**
 * Initialize Bangladesh Division -> District -> Thana Cascading Dropdowns
 */
function initLocationDropdowns() {
    const divSelect = document.getElementById('custDivision');
    if (!divSelect) return;

    divSelect.innerHTML = '<option value="">-- Select Division --</option>';
    const divisions = Object.keys(BD_LOCATIONS);
    divisions.forEach(div => {
        const opt = document.createElement('option');
        opt.value = div;
        opt.textContent = div;
        divSelect.appendChild(opt);
    });

    // Default to Chattogram on initial load
    divSelect.value = 'Chattogram';
    onDivisionChange();

    const distSelect = document.getElementById('custDistrict');
    if (distSelect) {
        distSelect.value = 'Chattogram';
        onDistrictChange();
    }
}

/**
 * Triggered when customer changes Division
 */
function onDivisionChange() {
    const divSelect = document.getElementById('custDivision');
    const distSelect = document.getElementById('custDistrict');
    const thanaSelect = document.getElementById('custThana');
    if (!divSelect || !distSelect || !thanaSelect) return;

    const selectedDivision = divSelect.value;
    distSelect.innerHTML = '<option value="">-- Select District --</option>';
    thanaSelect.innerHTML = '<option value="">-- Select District First --</option>';
    thanaSelect.disabled = true;

    if (!selectedDivision || !BD_LOCATIONS[selectedDivision]) {
        distSelect.disabled = true;
        return;
    }

    const districts = Object.keys(BD_LOCATIONS[selectedDivision]).sort();
    districts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        distSelect.appendChild(opt);
    });

    distSelect.disabled = false;
}
window.onDivisionChange = onDivisionChange;

/**
 * Triggered when customer changes District:
 * 1. Populates Thanas / Upazilas
 * 2. Automatically syncs delivery area and shipping charge (Inside Chattogram ৳70 vs Outside Chattogram ৳130)
 */
function onDistrictChange() {
    const divSelect = document.getElementById('custDivision');
    const distSelect = document.getElementById('custDistrict');
    const thanaSelect = document.getElementById('custThana');
    const cityInput = document.getElementById('custCity');
    if (!divSelect || !distSelect || !thanaSelect) return;

    const selectedDivision = divSelect.value;
    const selectedDistrict = distSelect.value;

    thanaSelect.innerHTML = '<option value="">-- Select Thana / Upazila --</option>';

    if (!selectedDivision || !selectedDistrict || !BD_LOCATIONS[selectedDivision]?.[selectedDistrict]) {
        thanaSelect.disabled = true;
        return;
    }

    const thanas = BD_LOCATIONS[selectedDivision][selectedDistrict];
    thanas.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        thanaSelect.appendChild(opt);
    });

    thanaSelect.disabled = false;

    if (cityInput) cityInput.value = selectedDistrict;

    // Automatically sync delivery destination & shipping charge
    if (selectedDistrict === 'Chattogram') {
        selectDeliveryArea('Inside Chattogram', 70);
    } else {
        selectDeliveryArea('Outside Chattogram', 130);
    }
}
window.onDistrictChange = onDistrictChange;

/**
 * Check if user is logged in & prefill contact details
 */
async function checkUserSession() {
    if (window.API && API.getToken()) {
        try {
            const user = await API.getProfile();
            if (user) {
                checkoutState.currentUser = user;
                const nameInput = document.getElementById('custFullName');
                const phoneInput = document.getElementById('custPhone');
                const emailInput = document.getElementById('custEmail');
                const addressInput = document.getElementById('custAddress');
                const postalInput = document.getElementById('custPostal');

                if (nameInput && (user.name || user.username)) nameInput.value = user.name || user.username;
                if (phoneInput && user.phone) phoneInput.value = user.phone;
                if (emailInput && user.email) emailInput.value = user.email;
                if (addressInput && user.address) addressInput.value = user.address;
                if (postalInput && user.postalCode) postalInput.value = user.postalCode;

                // Prefill location dropdowns if stored in profile
                if (user.division && BD_LOCATIONS[user.division]) {
                    const divSelect = document.getElementById('custDivision');
                    if (divSelect) {
                        divSelect.value = user.division;
                        onDivisionChange();
                    }
                    if (user.district && BD_LOCATIONS[user.division]?.[user.district]) {
                        const distSelect = document.getElementById('custDistrict');
                        if (distSelect) {
                            distSelect.value = user.district;
                            onDistrictChange();
                        }
                        if (user.thana) {
                            const thanaSelect = document.getElementById('custThana');
                            if (thanaSelect) thanaSelect.value = user.thana;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Session check notice:', e.message);
        }
    }
}

/**
 * Load items for Checkout:
 * Prioritizes selected items from Selective Cart (sessionStorage), with API / LocalStorage fallback
 */
async function loadCheckoutCart() {
    let items = [];
    let subtotal = 0;

    // Check if selective cart checkout items were passed from cart.html or direct Buy Now
    try {
        const rawSelected = sessionStorage.getItem('pico_checkout_items');
        if (rawSelected) {
            const parsed = JSON.parse(rawSelected);
            if (Array.isArray(parsed) && parsed.length > 0) {
                items = parsed;
            }
        }
    } catch (e) {
        console.warn('Could not parse sessionStorage selective checkout items:', e);
    }

    // If no selective items stored, check Live API Cart first
    if (items.length === 0 && window.API && API.getToken()) {
        try {
            const apiCart = await API.getCart();
            if (apiCart && apiCart.items && apiCart.items.length > 0) {
                items = apiCart.items;
            }
        } catch (err) {
            console.warn('Could not fetch API cart:', err.message);
        }
    }

    // Guest fallback if still empty
    if (items.length === 0) {
        try {
            const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
            const localCart = rawLocal ? JSON.parse(rawLocal) : [];

            if (localCart.length > 0) {
                const catalog = await API.getProducts();
                localCart.forEach(localItem => {
                    const id = localItem.productId || localItem.id;
                    const product = catalog.find(p => p.id === id || p._id === id);
                    if (product) {
                        const lineSubtotal = product.price * localItem.quantity;
                        items.push({
                            productId: product.id,
                            name: product.name,
                            price: product.price,
                            image: product.image,
                            quantity: localItem.quantity,
                            color: localItem.color || '',
                            itemSubtotal: lineSubtotal
                        });
                    }
                });
            }
        } catch (err) {
            console.warn('Guest cart parsing error:', err.message);
        }
    }

    // Calculate subtotal from verified items
    subtotal = items.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);

    checkoutState.cartItems = items;
    checkoutState.subtotal = subtotal;

    // Check for pre-applied coupon from cart.html
    try {
        const savedCoupon = sessionStorage.getItem('pico_checkout_coupon');
        if (savedCoupon) {
            const parsedCoupon = JSON.parse(savedCoupon);
            if (parsedCoupon && parsedCoupon.code && subtotal > 0) {
                checkoutState.couponCode = parsedCoupon.code;
                if (parsedCoupon.discountType === 'percentage') {
                    checkoutState.discountAmount = Math.round((subtotal * parsedCoupon.discountValue) / 100);
                } else {
                    checkoutState.discountAmount = Math.min(parsedCoupon.discountValue, subtotal);
                }
                const input = document.getElementById('checkoutCouponInput');
                if (input) input.value = parsedCoupon.code;
            }
        }
    } catch (e) {
        console.warn('Could not restore saved coupon:', e);
    }

    // Shipping calculation: defaults to Inside Chattogram (৳70.00)
    checkoutState.shippingFee = checkoutState.deliveryArea === 'Outside Chattogram' ? 130.00 : 70.00;
    const effectiveSubtotal = Math.max(0, subtotal - checkoutState.discountAmount);
    checkoutState.total = Math.max(0, effectiveSubtotal + (subtotal > 0 ? checkoutState.shippingFee : 0));

    // Render Order Summary
    renderOrderSummary();

    // Toggle Empty Cart State if zero items
    const emptySection = document.getElementById('checkoutEmptySection');
    const activeSection = document.getElementById('checkoutActiveSection');

    if (items.length === 0) {
        if (activeSection) activeSection.style.display = 'none';
        if (emptySection) emptySection.style.display = 'block';
    } else {
        if (emptySection) emptySection.style.display = 'none';
        if (activeSection) activeSection.style.display = 'block';
    }
}

/**
 * 2. Render Order Summary & Calculation Breakdown
 */
function renderOrderSummary() {
    const listContainer = document.getElementById('checkoutItemsList');
    const subtotalEl = document.getElementById('summarySubtotal');
    const discountRow = document.getElementById('summaryDiscountRow');
    const couponCodeEl = document.getElementById('summaryCouponCode');
    const discountEl = document.getElementById('summaryDiscountAmount');
    const shippingEl = document.getElementById('summaryShippingFee');
    const grandTotalEl = document.getElementById('summaryGrandTotal');
    const btnTotalText = document.getElementById('btnTotalText');
    const shippingHint = document.getElementById('shippingPolicyHint');

    if (!listContainer) return;

    if (checkoutState.cartItems.length === 0) {
        listContainer.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No items selected for checkout.</p>';
        return;
    }

    listContainer.innerHTML = checkoutState.cartItems.map(item => `
        <div class="summary-item-row">
            <img src="${item.image}" alt="${escapeHTML(item.name)}" onerror="this.src='images/logo.png'">
            <div class="summary-item-info">
                <h4>${escapeHTML(item.name)}</h4>
                <div class="summary-item-meta">
                    <span class="qty-badge">Qty: ${item.quantity}</span>
                    ${item.color ? `<span class="qty-badge" style="background:#ffedd5; color:#9a3412;">Color: ${escapeHTML(item.color)}</span>` : ''}
                    <span class="unit-price">৳${Number(item.price).toFixed(2)} each</span>
                </div>
            </div>
            <div class="summary-line-total">
                ৳${Number(item.price * item.quantity).toFixed(2)}
            </div>
        </div>
    `).join('');

    if (subtotalEl) subtotalEl.textContent = `৳${Number(checkoutState.subtotal).toFixed(2)}`;

    if (discountRow) {
        if (checkoutState.discountAmount > 0 && checkoutState.couponCode) {
            discountRow.style.display = 'flex';
            if (couponCodeEl) couponCodeEl.textContent = checkoutState.couponCode;
            if (discountEl) discountEl.textContent = `-৳${Number(checkoutState.discountAmount).toFixed(2)}`;
        } else {
            discountRow.style.display = 'none';
        }
    }

    const deliveryAreaEl = document.getElementById('summaryDeliveryArea');
    if (deliveryAreaEl) deliveryAreaEl.textContent = checkoutState.deliveryArea || 'Inside Chattogram';

    if (shippingEl) {
        shippingEl.textContent = `৳${Number(checkoutState.shippingFee).toFixed(2)}`;
        shippingEl.style.color = '#C8743A';
        shippingEl.style.fontWeight = '600';
    }

    if (grandTotalEl) grandTotalEl.textContent = `৳${Number(checkoutState.total).toFixed(2)}`;
    if (btnTotalText) btnTotalText.textContent = `৳${Number(checkoutState.total).toFixed(2)}`;

    if (shippingHint) {
        shippingHint.innerHTML = '<small><i class="fa-solid fa-truck-ramp-box"></i> Direct door-to-door delivery with packaging guarantee</small>';
    }
}

/**
 * 2.5 Apply Coupon directly on Checkout Page
 */
async function applyCheckoutCoupon() {
    const input = document.getElementById('checkoutCouponInput');
    const msgEl = document.getElementById('checkoutCouponMsg');
    const btn = document.getElementById('checkoutApplyCouponBtn');
    const code = input ? input.value.trim().toUpperCase() : '';

    if (!code) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Please enter a coupon code.';
        }
        return;
    }

    if (checkoutState.subtotal <= 0) {
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.textContent = 'Cart subtotal is zero.';
        }
        return;
    }

    try {
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Validating...';
        }

        const res = await API.validateCoupon(code, checkoutState.subtotal);

        if (res && res.valid) {
            checkoutState.couponCode = res.code;
            checkoutState.discountAmount = res.discountAmount;

            const effectiveSubtotal = Math.max(0, checkoutState.subtotal - checkoutState.discountAmount);
            checkoutState.total = Math.max(0, effectiveSubtotal + checkoutState.shippingFee);

            sessionStorage.setItem('pico_checkout_coupon', JSON.stringify({
                code: res.code,
                discountType: res.discountType,
                discountValue: res.discountValue,
                discountAmount: res.discountAmount
            }));

            if (msgEl) {
                msgEl.style.display = 'block';
                msgEl.className = 'coupon-feedback-msg success';
                msgEl.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${res.message || `Coupon "${res.code}" applied!`}`;
            }

            renderOrderSummary();
        } else {
            throw new Error(res?.error || 'Invalid coupon code');
        }
    } catch (err) {
        checkoutState.couponCode = '';
        checkoutState.discountAmount = 0;
        sessionStorage.removeItem('pico_checkout_coupon');

        const effectiveSubtotal = checkoutState.subtotal;
        checkoutState.shippingFee = checkoutState.deliveryArea === 'Outside Chattogram' ? 130.00 : 70.00;
        checkoutState.total = Math.max(0, effectiveSubtotal + checkoutState.shippingFee);

        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'coupon-feedback-msg error';
            msgEl.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${err.message || 'Invalid coupon code'}`;
        }

        renderOrderSummary();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Apply';
        }
    }
}

/**
 * 2.8 Delivery Area Switcher (Inside Chattogram: ৳70, Outside Chattogram: ৳130)
 */
function selectDeliveryArea(area, fee, labelElement) {
    checkoutState.deliveryArea = area;
    checkoutState.shippingFee = Number(fee) || (area === 'Outside Chattogram' ? 130.00 : 70.00);
    const effectiveSubtotal = Math.max(0, checkoutState.subtotal - checkoutState.discountAmount);
    checkoutState.total = Math.max(0, effectiveSubtotal + (checkoutState.subtotal > 0 ? checkoutState.shippingFee : 0));

    const cards = document.querySelectorAll('.delivery-option-card');
    cards.forEach(card => card.classList.remove('active'));

    if (labelElement) {
        labelElement.classList.add('active');
        const radio = labelElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    } else {
        const targetRadio = document.querySelector(`input[name="deliveryArea"][value="${area}"]`);
        if (targetRadio) {
            targetRadio.checked = true;
            const parentLabel = targetRadio.closest('.delivery-option-card');
            if (parentLabel) parentLabel.classList.add('active');
        }
    }

    // Automatically sync COD advance fee notices
    const codFeeText = document.getElementById('codAdvanceFeeText');
    const codAreaText = document.getElementById('codAdvanceAreaText');
    const codCheckFee = document.getElementById('codAdvanceCheckFee');
    if (codFeeText) codFeeText.textContent = `৳${checkoutState.shippingFee.toFixed(2)}`;
    if (codAreaText) codAreaText.textContent = checkoutState.deliveryArea;
    if (codCheckFee) codCheckFee.textContent = `৳${checkoutState.shippingFee.toFixed(2)}`;

    renderOrderSummary();
}
window.selectDeliveryArea = selectDeliveryArea;

/**
 * 3. Payment Method Switcher (Cash on Delivery vs bKash / Mobile Banking)
 */
function selectPaymentMethod(method, labelElement) {
    checkoutState.selectedPayment = method;

    const cards = document.querySelectorAll('.payment-option-card');
    cards.forEach(card => card.classList.remove('active'));

    if (labelElement) {
        labelElement.classList.add('active');
        const radio = labelElement.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
    }

    // Toggle Cash on Delivery (COD) Advance Condition Box
    const codBox = document.getElementById('codAdvanceNoticeBox');
    if (codBox) {
        codBox.style.display = method === 'Cash on Delivery' ? 'block' : 'none';
    }
}
window.selectPaymentMethod = selectPaymentMethod;

/**
 * Helper to copy payment numbers quickly
 */
function copyPaymentNumber(number, el) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(number).then(() => {
            showToast(`Copied ${number} to clipboard!`, 'success');
        }).catch(() => {
            showToast(`Number: ${number}`, 'info');
        });
    } else {
        showToast(`Number: ${number}`, 'info');
    }
}
window.copyPaymentNumber = copyPaymentNumber;

/**
 * 4. Handle Checkout Form Submission (Create Order)
 */
async function handleCheckoutSubmit(e) {
    e.preventDefault();

    if (checkoutState.cartItems.length === 0) {
        showToast('Your shopping cart is empty.', 'warning');
        return;
    }

    const submitBtn = document.getElementById('submitOrderBtn');
    const fullName = document.getElementById('custFullName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const address = document.getElementById('custAddress').value.trim();
    const division = document.getElementById('custDivision') ? document.getElementById('custDivision').value.trim() : '';
    const district = document.getElementById('custDistrict') ? document.getElementById('custDistrict').value.trim() : '';
    const thana = document.getElementById('custThana') ? document.getElementById('custThana').value.trim() : '';
    const postalCode = document.getElementById('custPostal').value.trim();
    const notes = document.getElementById('orderNotes').value.trim();

    if (!fullName || !phone || !email || !address) {
        showToast('Please fill out your contact and address details.', 'warning');
        return;
    }

    if (!division || !district || !thana) {
        showToast('Please select your Division, District, and Thana / Upazila from the dropdowns.', 'warning');
        const divEl = document.getElementById('custDivision');
        if (divEl) divEl.focus();
        return;
    }

    // Validate Cash on Delivery (COD) Advance Delivery Charge Condition
    let advancePaymentDetails = null;
    if (checkoutState.selectedPayment === 'Cash on Delivery') {
        const trxIdInput = document.getElementById('codAdvanceTrxId');
        const confirmCheck = document.getElementById('codAdvanceConfirmCheck');
        const trxVal = trxIdInput ? trxIdInput.value.trim() : '';

        if (!trxVal) {
            showToast('Please enter the advance delivery charge Transaction ID (TrxID) or Sender Mobile Number.', 'warning');
            if (trxIdInput) trxIdInput.focus();
            return;
        }

        if (!confirmCheck || !confirmCheck.checked) {
            showToast('Please check the confirmation box confirming that you have sent the advance delivery fee.', 'warning');
            if (confirmCheck) confirmCheck.focus();
            return;
        }

        advancePaymentDetails = {
            trxId: trxVal,
            senderPhone: trxVal,
            amount: checkoutState.shippingFee,
            isConfirmed: true
        };
    }

    const payload = {
        shippingAddress: {
            fullName,
            phone,
            address: notes ? `${address} (Note: ${notes})` : address,
            division,
            district,
            thana,
            city: district,
            postalCode
        },
        email,
        paymentMethod: checkoutState.selectedPayment,
        deliveryArea: checkoutState.deliveryArea || 'Inside Chattogram',
        couponCode: checkoutState.couponCode || '',
        discountAmount: checkoutState.discountAmount || 0,
        advancePaymentDetails,
        items: checkoutState.cartItems.map(item => ({
            productId: item.productId || item.id,
            quantity: item.quantity,
            color: item.color || ''
        }))
    };

    try {
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Your Order...';
        }

        const res = await API.createOrder(payload);

        if (!res || !res.order) {
            throw new Error(res?.error || 'Order creation failed.');
        }

        const createdOrder = res.order;
        checkoutState.currentOrder = createdOrder;

        // Clean up session storage selective items and coupon
        sessionStorage.removeItem('pico_checkout_items');
        sessionStorage.removeItem('pico_checkout_coupon');

        // Clean up guest local cart: remove only purchased items
        try {
            const rawLocal = localStorage.getItem(CART_STORAGE_KEY);
            if (rawLocal) {
                let localCart = JSON.parse(rawLocal);
                const purchasedIds = new Set(checkoutState.cartItems.map(i => String(i.productId || i.id)));
                localCart = localCart.filter(item => !purchasedIds.has(String(item.productId || item.id)));
                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(localCart));
            }
        } catch (e) {
            console.warn('Guest cart cleanup notice:', e);
        }

        // Notify badge listeners
        window.dispatchEvent(new Event('pico_cart_updated'));
        if (window.updateCartNavBadges) window.updateCartNavBadges();

        // Transition from Form to Order Success Receipt
        showOrderSuccess(createdOrder, { 
            fullName, email, phone, address, division, district, thana, postalCode, advancePaymentDetails 
        });

    } catch (err) {
        console.error('Checkout error:', err);
        showToast(`Could not complete order: ${err.message}`, 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-lock"></i> Place Order (৳${Number(checkoutState.total).toFixed(2)}) &#10140;`;
        }
    }
}

/**
 * 5. Display Order Success & Populate Printable Invoice (No Tax + Shows Discount)
 */
function showOrderSuccess(order, customer) {
    const activeSection = document.getElementById('checkoutActiveSection');
    const successSection = document.getElementById('checkoutSuccessSection');

    if (activeSection) activeSection.style.display = 'none';
    if (successSection) successSection.style.display = 'block';

    const shortId = order._id ? order._id.substring(order._id.length - 8).toUpperCase() : 'N/A';
    const formattedDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : new Date().toLocaleDateString();

    // Populate Success Banner Meta
    const nameEl = document.getElementById('successCustomerName');
    const idEl = document.getElementById('successOrderId');
    const dateEl = document.getElementById('successOrderDate');
    const areaEl = document.getElementById('successDeliveryArea');
    const payEl = document.getElementById('successPaymentMethod');
    const totalEl = document.getElementById('successTotalAmount');

    if (nameEl) nameEl.textContent = customer.fullName || 'Collector';
    if (idEl) idEl.textContent = `#${shortId}`;
    if (dateEl) dateEl.textContent = formattedDate;
    if (areaEl) areaEl.textContent = order.deliveryArea || checkoutState.deliveryArea || 'Inside Chattogram';
    if (payEl) payEl.textContent = order.paymentMethod || 'Cash on Delivery';
    if (totalEl) totalEl.textContent = `৳${Number(order.totalAmount || 0).toFixed(2)}`;

    // Populate Official Printable Invoice
    const invNumber = document.getElementById('invNumber');
    const invDate = document.getElementById('invDate');
    const invStatus = document.getElementById('invStatus');
    const invCustName = document.getElementById('invCustName');
    const invCustAddress = document.getElementById('invCustAddress');
    const invCustDivisionDistrict = document.getElementById('invCustDivisionDistrict');
    const invCustPostal = document.getElementById('invCustPostal');
    const invCustPhone = document.getElementById('invCustPhone');
    const invCustEmail = document.getElementById('invCustEmail');
    const invDeliveryArea = document.getElementById('invDeliveryArea');
    const invPaymentMethod = document.getElementById('invPaymentMethod');
    const invItemsBody = document.getElementById('invItemsTableBody');
    const invSubtotal = document.getElementById('invSubtotal');
    const invDiscountRow = document.getElementById('invDiscountRow');
    const invCouponCode = document.getElementById('invCouponCode');
    const invDiscount = document.getElementById('invDiscount');
    const invShipping = document.getElementById('invShipping');
    const invGrandTotal = document.getElementById('invGrandTotal');
    const invAdvanceRow = document.getElementById('invAdvanceInfoRow');
    const invAdvanceTrxEl = document.getElementById('invAdvanceTrxId');

    if (invNumber) invNumber.textContent = `INV-${shortId}`;
    if (invDate) invDate.textContent = formattedDate;
    if (invStatus) invStatus.textContent = order.paymentMethod === 'Cash on Delivery' ? 'CONFIRMED (COD ADVANCE RECEIVED)' : 'PAID';
    if (invCustName) invCustName.textContent = customer.fullName || 'N/A';
    if (invCustAddress) invCustAddress.textContent = customer.address || 'N/A';

    const locationText = [
        customer.thana,
        customer.district || customer.city,
        customer.division
    ].filter(Boolean).join(', ');

    if (invCustDivisionDistrict) invCustDivisionDistrict.textContent = locationText || customer.city || 'Chattogram';
    if (invCustPostal) invCustPostal.textContent = customer.postalCode || '';
    if (invCustPhone) invCustPhone.textContent = customer.phone || 'N/A';
    if (invCustEmail) invCustEmail.textContent = customer.email || 'N/A';
    if (invDeliveryArea) invDeliveryArea.textContent = order.deliveryArea || checkoutState.deliveryArea || 'Inside Chattogram';
    if (invPaymentMethod) invPaymentMethod.textContent = order.paymentMethod || 'Cash on Delivery';

    // Show advance delivery fee TrxID if COD order
    if (invAdvanceRow && invAdvanceTrxEl) {
        const trx = order.advancePaymentDetails?.trxId || customer.advancePaymentDetails?.trxId;
        if (trx && order.paymentMethod === 'Cash on Delivery') {
            invAdvanceRow.style.display = 'block';
            invAdvanceTrxEl.textContent = trx;
        } else {
            invAdvanceRow.style.display = 'none';
        }
    }

    if (invItemsBody) {
        const items = order.orderItems || [];
        invItemsBody.innerHTML = items.map((item, index) => `
            <tr>
                <td style="text-align: center; color: #64748b;">${index + 1}</td>
                <td>
                    <strong>${escapeHTML(item.name)}</strong>
                    ${item.color ? `<div style="font-size: 11px; color: #c8743a; font-weight: 600;">Color: ${escapeHTML(item.color)}</div>` : ''}
                    <div style="font-size: 11px; color: #64748b;">SKU / ID: ${escapeHTML(item.productId)}</div>
                </td>
                <td style="text-align: right;">৳${Number(item.price).toFixed(2)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right; font-weight: 600;">৳${Number(item.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');
    }

    if (invSubtotal) invSubtotal.textContent = `৳${Number(order.subtotal || 0).toFixed(2)}`;

    // Invoice Discount row (tax removed!)
    if (invDiscountRow) {
        const disc = Number(order.discountAmount || 0);
        if (disc > 0) {
            invDiscountRow.style.display = 'flex';
            if (invCouponCode) invCouponCode.textContent = order.couponCode || 'PROMO';
            if (invDiscount) invDiscount.textContent = `-৳${disc.toFixed(2)}`;
        } else {
            invDiscountRow.style.display = 'none';
        }
    }

    if (invShipping) invShipping.textContent = `৳${Number(order.shippingFee !== undefined ? order.shippingFee : checkoutState.shippingFee).toFixed(2)}`;
    if (invGrandTotal) invGrandTotal.textContent = `৳${Number(order.totalAmount || 0).toFixed(2)}`;

    // Scroll smoothly to receipt header
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 6. Generate and Download PDF Invoice via html2pdf.js
 */
function downloadInvoicePDF() {
    const invoiceEl = document.getElementById('printableInvoice');
    if (!invoiceEl) {
        showToast('Invoice element could not be found.', 'error');
        return;
    }

    const orderId = (checkoutState.currentOrder && checkoutState.currentOrder._id) 
        ? checkoutState.currentOrder._id.substring(checkoutState.currentOrder._id.length - 8).toUpperCase()
        : 'RECEIPT';

    // Verify if html2pdf CDN is loaded
    if (typeof html2pdf === 'undefined') {
        console.warn('html2pdf.js CDN not ready; falling back to window.print()');
        window.print();
        return;
    }

    const opt = {
        margin: [8, 8, 8, 8],
        filename: `PicoPicks_Invoice_${orderId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    const downloadBtn = document.querySelector('.btn-pdf');
    if (downloadBtn) {
        downloadBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating PDF...';
        downloadBtn.disabled = true;
    }

    html2pdf()
        .set(opt)
        .from(invoiceEl)
        .save()
        .then(() => {
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)';
                downloadBtn.disabled = false;
            }
        })
        .catch(err => {
            console.error('PDF generation error:', err);
            showToast('PDF generation encountered an issue. Using system print instead.', 'warning');
            window.print();
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fa-solid fa-file-pdf"></i> Download Invoice (PDF)';
                downloadBtn.disabled = false;
            }
        });
}

// Global exposure for inline onclick handlers
window.selectPaymentMethod = selectPaymentMethod;
window.handleCheckoutSubmit = handleCheckoutSubmit;
window.downloadInvoicePDF = downloadInvoicePDF;
window.applyCheckoutCoupon = applyCheckoutCoupon;

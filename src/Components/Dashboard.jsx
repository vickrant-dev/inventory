import { useEffect, useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";
import { Loader, Plus, Trash } from "lucide-react";
import { supabase } from '../utils/supabase';

export default function App() {
    const [form, setForm] = useState({
        item: [""],
        customer: "",
        invoiceNo: "",
        invoiceDate: "",
        serialNumber: [""],
        quantity: [""],
    });
    const [inventory, setInventory] = useState([]);
    const [searchSerial, setSearchSerial] = useState("");
    const [searchResult, setSearchResult] = useState(null);

    const [dropDownData, setDropDownData] = useState({});
    const [activeField, setActiveField] = useState(null);

    const [loading, setLoading] = useState({
        inventory: false,
        search: false,
    });

    const navigate = useNavigate();

    const user_username = localStorage.getItem("username");

    const [modelForm, setModelForm] = useState({
        productName: "",
        barcodeId: "",
    });
    const [modelLoading, setModelLoading] = useState(false);

    useEffect(() => {
        const isAuthenticated = localStorage.getItem("isAuthenticated");
        const loginTime = localStorage.getItem("loginTime");

        if (!isAuthenticated || !loginTime) {
            localStorage.removeItem("isAuthenticated");
            navigate("/login");
        }

        const currentTime = Date.now();
        const twelveHours = 12 * 60 * 60 * 1000;

        if (currentTime - loginTime > twelveHours) {
            localStorage.removeItem("isAuthenticated");
            navigate("/login");
        }
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("isAuthenticated");
        navigate("/login");
    };

    // Fetch inventory from Supabase on load
    useEffect(() => {
        const fetchInventory = async () => {
            const { data, error } = await supabase
                .from("inventorynew")
                .select("*");
            if (error) {
                console.error("Error fetching inventory:", error.message);
            } else {
                setInventory(data);
            }
        };
        fetchInventory();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setForm((prevForm) => ({ ...prevForm, [name]: value }));

        if (name) {
            setActiveField(name);
            const filteredResults = inventory
                .map((item) => item[name])
                .filter(
                    (val, index, self) => val && self.indexOf(val) === index
                )
                .filter((val) =>
                    val.toLowerCase().includes(value.toLowerCase())
                )
                .sort((a, b) => {
                    const aStartsWithInput = a
                        .toLowerCase()
                        .startsWith(value.toLowerCase());
                    const bStartsWithInput = b
                        .toLowerCase()
                        .startsWith(value.toLowerCase());

                    if (aStartsWithInput && !bStartsWithInput) return -1;
                    if (!aStartsWithInput && bStartsWithInput) return 1;
                    return a.localeCompare(b);
                });

            setDropDownData({ ...dropDownData, [name]: filteredResults });
        } // ⭐
    };

    const handleSelectItem = (name, value) => {
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
        setActiveField(null);
    };

    const handleConfirmSubmit = (e) => {
        e.preventDefault();

        const checkFilled = Object.values(form).every((value) => {
            if (Array.isArray(value)) {
                return value.every((item) => !!item);
            }
            return !!value;
        });

        if (checkFilled) {
            const message = form.serialNumber
                .map(
                    (serial, i) =>
                        `Item: ${form.item[i]}, Serial: ${serial}, Quantity: ${form.quantity[i]}?`
                )
                .join("\n");

            if (
                window.confirm(
                    `Are you sure you want to add the following \n\n${message}`
                )
            ) {
                handleSubmit();
                return;
            } else {
                // console.log("Submission cancelled.");
                return;
            }
        } else {
            alert("Please fill in all the blanks.");
            return;
        }
    };

    const handleSubmit = async () => {
        setLoading((prev) => ({
            ...prev,
            inventory: true,
        }));
        
        // Check if each of those serials exist already after iterating


        try {
            let newEntries = [];

            form.serialNumber.forEach((serial, index) => {
                const parts = serial.split("-");
                if (parts.length !== 2 || isNaN(parts[1])) {
                    alert(`Invalid serial number format: ${serial}`);
                    setLoading((prev) => ({
                        ...prev,
                        inventory: false,
                    }));
                    return;
                }

                const prefix = parts[0];
                const baseNumber = Number.parseInt(parts[1], 10);

                const quantity = form.quantity[index];
                const itemName = form.item[index]; // Store the item name for this specific index

                for (let i = 0; i < quantity; i++) {
                    const uniqueSerial = `${prefix}-${baseNumber + i}`;
                    newEntries.push({
                        item: itemName, // Use the item name from the correct index
                        serial_number: uniqueSerial,
                        customer: form.customer,
                        invoice_no: form.invoiceNo,
                        invoice_date: form.invoiceDate,
                    });
                }

                // console.log('newEntries:', newEntries);
            });

            const { data: existingData, error: fetchError } = await supabase
                .from("inventorynew")
                .select("serial_number")
                .in(
                    "serial_number",
                    newEntries.map((entry) => entry.serial_number)
                );

            if (fetchError) {
                console.error(
                    "Error fetching existing serial numbers:",
                    fetchError.message
                );
                setLoading((prev) => ({
                    ...prev,
                    inventory: false,
                }));
                return;
            }

            // Convert existing serial numbers into a Set for quick lookup
            const existingSerials = new Set(
                existingData.map((item) => item.serial_number)
            );

            // Filter out already existing serial numbers
            newEntries = newEntries.filter(
                (entry) => !existingSerials.has(entry.serial_number)
            );

            if (newEntries.length === 0) {
                alert(
                    "All serial numbers already exist. No new entries were added."
                );
                setLoading((prev) => ({
                    ...prev,
                    inventory: false,
                }));
                return;
            }

            // Insert only unique serial numbers into Supabase
            const { data, error } = await supabase
                .from("inventorynew")
                .insert(newEntries)
                .select();

            if (error) {
                console.error("Error inserting data:", error.message);
                setLoading((prev) => ({
                    ...prev,
                    inventory: false,
                }));
                alert("Error adding entry. Ensure serial numbers are unique.");
            } else {
                setInventory([...inventory, ...data]);
                setForm({
                    item: [""],
                    serialNumber: [""],
                    customer: "",
                    invoiceNo: "",
                    invoiceDate: "",
                    quantity: [""],
                });
                setLoading((prev) => ({
                    ...prev,
                    inventory: false,
                }));
                const message = form.serialNumber
                    .map(
                        (serial, i) =>
                            `Item: ${form.item[i]}, Serial: ${serial}, Quantity: ${form.quantity[i]}`
                    )
                    .join("\n");
                alert(`Successfully added the following: \n\n${message}`);
            }
        } catch (error) {
            console.error("Submission Error:", error.message);
            setLoading((prev) => ({
                ...prev,
                inventory: false,
            }));
        }
    }; // ⭐

    const handleModelSubmit = async (e) => {
        e.preventDefault();

        if (!modelForm.productName || !modelForm.barcodeId) {
            alert("Please fill in all fields");
            return;
        }

        setModelLoading(true);

        try {
            // Check if barcode already exists
            const { data: existingBarcode, error: checkError } = await supabase
                .from("products")
                .select("barcode_id")
                .eq("barcode_id", modelForm.barcodeId)
                .single();

            if (checkError && checkError.code !== "PGRST116") {
                console.error("Error checking barcode:", checkError.message);
                alert("Error checking barcode. Please try again.");
                setModelLoading(false);
                return;
            }

            if (existingBarcode) {
                alert(
                    "This barcode ID already exists. Please use a different one."
                );
                setModelLoading(false);
                return;
            }

            // Insert new model
            const { data, error } = await supabase
                .from("products")
                .insert([
                    {
                        product_name: modelForm.productName,
                        barcode_id: modelForm.barcodeId,
                    },
                ])
                .select();

            if (error) {
                console.error("Error adding model:", error.message);
                alert("Error adding model. Please try again.");
            } else {
                alert(
                    `Successfully added new model: ${modelForm.productName} with barcode: ${modelForm.barcodeId}`
                );
                setModelForm({ productName: "", barcodeId: "" });
            }
        } catch (error) {
            console.error("Model submission error:", error.message);
            alert("An unexpected error occurred. Please try again.");
        } finally {
            setModelLoading(false);
        }
    };

    useEffect(() => {
        // console.log(form);
        // console.log(inventory);
    }, [form, inventory]);

    const debounceTimers = {};

    const handleSerialNumberChange = (e, index) => {
        const input = e.target.value.trim().toUpperCase();
        const newSerialNumbers = [...form.serialNumber];
        newSerialNumbers[index] = input;

        setForm((prevForm) => ({
            ...prevForm,
            serialNumber: newSerialNumbers,
        }));
    };

    const processSerialNumber = async (index) => {
        const serialInput = form.serialNumber[index].trim();
        const [serialPart, qtyPart] = serialInput.split("_"); // Split the input

        const newSerialNumbers = [...form.serialNumber];
        const newQuantities = [...form.quantity];
        const newItem = [...form.item];

        newSerialNumbers[index] = serialPart; // Save only the serial part

        if (qtyPart) {
            newQuantities[index] = Number(qtyPart);
        }

        // Update form with processed values
        setForm((prevForm) => ({
            ...prevForm,
            serialNumber: newSerialNumbers,
            quantity: newQuantities,
        }));

        // Process model code
        const modelCode = serialPart.split("-")[0];

        if (modelCode) {
            const { data, error } = await supabase
                .from("products")
                .select("product_name")
                .eq("barcode_id", modelCode)
                .single();

            if (error) {
                console.error(
                    `Error fetching item name for index ${index}:`,
                    error.message
                );
            } else if (data) {
                newItem[index] = data.product_name;
                setForm((prevForm) => ({
                    ...prevForm,
                    item: newItem,
                }));
                // console.log(newItem[index]);
                // console.log(form);
            }
        }
    };

    const handleQuantityChange = (e, index) => {
        const newQuantities = [...form.quantity];
        newQuantities[index] = Number(e.target.value);
        setForm({ ...form, quantity: newQuantities });
    };

    const handleAddSerialQ = () => {
        setForm({
            ...form,
            serialNumber: [...form.serialNumber, ""],
            quantity: [...form.quantity, ""],
            item: [...form.item, ""]
        });
    };

    const handleDeleteSerialQ = (index) => {
        const newSerialNumbers = [...form.serialNumber];
        const newQuantities = [...form.quantity];
        const newItem = [...form.item];

        newSerialNumbers.splice(index, 1);
        newQuantities.splice(index, 1);
        newItem.splice(index, 1);

        setForm({
            ...form,
            serialNumber: newSerialNumbers,
            quantity: newQuantities,
            item: newItem
        });
    };

    const deleteEntry = async (id) => {
        const entry = inventory.find((item) => item.id === id);
        if (!entry) {
            alert("Entry not found");
            return;
        }

        const isConfirmed = window.confirm(
            `Are you sure you want to delete this entry?\n\nSerial number: ${entry.serial_number}\nCustomer: ${entry.customer}`
        );

        if (!isConfirmed) return;

        const { error } = await supabase
            .from("inventorynew")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting:", error.message);
            alert("Could not delete entry.");
        } else {
            setInventory((prevInventory) =>
                prevInventory.filter((item) => item.id !== id)
            );
        }
    };

    const handleSearch = async () => {
        if (!searchSerial.trim()) {
            setSearchResult(null);
            return;
        }

        setLoading((prev) => ({
            ...prev,
            search: true,
        }));

        const { data, error } = await supabase
            .from("inventorynew")
            .select("*")
            .eq("serial_number", searchSerial.trim());

        if (error) {
            console.error("Error searching for serial number:", error.message);
            setLoading((prev) => ({
                ...prev,
                search: false,
            }));
        } else {
            setSearchResult(data.length > 0 ? data[0] : null);
            setLoading((prev) => ({
                ...prev,
                search: false,
            }));
        }
    };

    const handleBackup = () => {
        const format = document.getElementById("backupFormat").value;
        switch (format) {
            case "csv":
                backupCSV();
                break;
            case "pdf":
                backupPDF();
                break;
            default:
                backupCSV();
        }
    };

    const backupCSV = () => {
        let numRows = Number.parseInt(
            prompt(
                `Enter the number of rows to back up (max: ${inventory.length}):`
            ),
            10
        );

        if (isNaN(numRows) || numRows <= 0) {
            alert("Please enter a valid number.");
            return;
        }

        numRows = Math.min(numRows, inventory.length); // Ensure it doesn't exceed inventory length

        const sortedInventory = inventory.slice().sort((a, b) => {
            return new Date(b.invoice_date) - new Date(a.invoice_date);
        });

        const selectedEntries = sortedInventory.slice(0, numRows);

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Item,Serial Number,Customer,Invoice No,Invoice Date\n"; // CSV headers

        selectedEntries.forEach((row) => {
            csvContent += `${row.item},${row.serial_number},${row.customer},${row.invoice_no},${row.invoice_date}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `inventory_backup_${numRows}_rows.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }; // ⭐

    const backupPDF = () => {
        let numRows = Number.parseInt(
            prompt(
                `Enter the number of rows to back up (max: ${inventory.length}):`
            ),
            10
        );

        if (isNaN(numRows) || numRows <= 0) {
            alert("Please enter a valid number.");
            return;
        }

        numRows = Math.min(numRows, inventory.length);

        const sortedInventory = inventory.slice().sort((a, b) => {
            return new Date(b.invoice_date) - new Date(a.invoice_date);
        });

        const selectedEntries = sortedInventory.slice(0, numRows);

        const doc = new jsPDF();
        let y = 20;
        const marginTop = 10;
        const pageHeight = doc.internal.pageSize.height;

        const addHeaders = () => {
            doc.setFontSize(12);
            doc.text("Inventory Backup", 14, marginTop);
            doc.line(10, marginTop + 2, 200, marginTop + 2);

            doc.text("Item", 10, y);
            doc.text("Serial Number", 50, y);
            doc.text("Customer", 100, y);
            doc.text("Invoice No", 150, y);
            doc.text("Invoice Date", 180, y);

            y += 10;
        };

        addHeaders();

        selectedEntries.forEach((row, index) => {
            if (y + 10 > pageHeight - 10) {
                // Check if new row fits on the page
                doc.addPage();
                y = marginTop + 10; // Reset y for new page
                addHeaders(); // Re-add headers for new page
            }

            doc.text(row.item, 10, y);
            doc.text(row.serial_number, 50, y);
            doc.text(row.customer, 100, y);
            doc.text(row.invoice_no, 150, y);
            doc.text(row.invoice_date, 180, y);
            y += 10;
        });

        doc.save(`inventory_backup_${numRows}_rows.pdf`);
    };
    // ⭐

    return (
        <>
            <div className="main-container">
                {/* User Login/Logout */}
                <div className="user-container">
                    <div className="left">
                        <h1>
                            Welcome Back <span>{user_username}!</span> 👋🏼
                        </h1>
                    </div>
                    <div className="right">
                        <button onClick={handleLogout}>Logout</button>
                    </div>
                </div>

                {/* Add new inventory */}
                <div className="add-information-container">
                    <form onSubmit={handleConfirmSubmit}>
                        <div className="input-container">
                            <h1>Enter Product Information 📄</h1>
                            <div className="input-container-box">
                                {["customer"].map((field) => (
                                    <label>
                                        <p>CUSTOMER NAME</p>
                                        <input
                                            type="text"
                                            name={field}
                                            placeholder={`CUSTOMER NAME...`}
                                            value={form[field]}
                                            onChange={handleInputChange}
                                            onBlur={() =>
                                                setTimeout(() => {
                                                    setActiveField(null);
                                                }, 100)
                                            }
                                        />

                                        {activeField === field &&
                                            dropDownData[field]?.length > 0 && (
                                                <ul className="dropdown">
                                                    {dropDownData[field]
                                                        .slice(0, 5)
                                                        .map((item, index) => (
                                                            <li
                                                                key={index}
                                                                onClick={() =>
                                                                    handleSelectItem(
                                                                        field,
                                                                        item
                                                                    )
                                                                }
                                                            >
                                                                {item}
                                                            </li>
                                                        ))}
                                                </ul>
                                            )}
                                    </label>
                                ))}
                                <label>
                                    <p>INVOICE NO</p>
                                    <input
                                        type="text"
                                        name="invoiceNo"
                                        placeholder="INVOICE NO..."
                                        value={form.invoiceNo}
                                        onChange={handleInputChange}
                                    />
                                </label>
                                <label>
                                    <p>INVOICE DATE</p>
                                    <input
                                        type="date"
                                        name="invoiceDate"
                                        value={form.invoiceDate}
                                        onChange={handleInputChange}
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="input-second-container">
                            <h2>Serial Numbers 🔢</h2>
                            <div className="input-second-box">
                                {form.serialNumber.map((serial, index) => (
                                    <div
                                        className="serial-quantity-inputs"
                                        key={index}
                                    >
                                        <label>
                                            <p>Model</p>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    height: "52px",
                                                    gap: "8px",
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    name={`serialNumber-${index}`}
                                                    value={form.item[index]}
                                                    readOnly
                                                    placeholder={`Model`}
                                                />
                                            </div>
                                        </label>
                                        <label>
                                            <p>Serial Number #{index + 1}</p>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    height: "52px",
                                                    gap: "8px",
                                                }}
                                            >
                                                <input
                                                    type="text"
                                                    name={`serialNumber-${index}`}
                                                    value={serial}
                                                    // style={{textTransform: 'uppercase'}}
                                                    onChange={(e) =>
                                                        handleSerialNumberChange(
                                                            e,
                                                            index
                                                        )
                                                    }
                                                    placeholder={`SERIAL NUMBER #${
                                                        index + 1
                                                    }...`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        processSerialNumber(
                                                            index
                                                        )
                                                    }
                                                    style={{
                                                        backgroundColor:
                                                            "#ffa600",
                                                        border: "1px solid #ffa600",
                                                        color: "#fff",
                                                        padding: "0px 12px",
                                                        height: "50px",
                                                        translate: "0 -15px",
                                                        borderRadius: "6px",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    <Plus size={17}/>
                                                </button>
                                            </div>
                                        </label>
                                        <label>
                                            <p>
                                                Quantity for Serial Number #
                                                {index + 1}
                                            </p>
                                            <input
                                                type="number"
                                                name={`quantity-${index}`}
                                                value={
                                                    form.quantity[index] || ""
                                                }
                                                onChange={(e) =>
                                                    handleQuantityChange(
                                                        e,
                                                        index
                                                    )
                                                }
                                                max={40}
                                            />
                                        </label>
                                        {form.serialNumber.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleDeleteSerialQ(index)
                                                }
                                                className="delete-serialQ-btn"
                                                aria-label={`Delete serial number ${
                                                    index + 1
                                                }`}
                                                style={{
                                                    backgroundColor: "#dc3545", // Bootstrap danger red
                                                    border: "1px solid #dc3545",
                                                    color: "#fff",
                                                    padding: "7px",
                                                    borderRadius: "6px",
                                                    cursor: "pointer",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                        "#c82333";
                                                    e.currentTarget.style.borderColor =
                                                        "#bd2130";
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                        "#dc3545";
                                                    e.currentTarget.style.borderColor =
                                                        "#dc3545";
                                                }}
                                            >
                                                <Trash size={19} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={handleAddSerialQ}
                                className="add-serialQ-btn"
                            >
                                Add New Serial
                            </button>
                        </div>
                        <div className="submit-btn">
                            <button type="submit">
                                {loading.inventory ? (
                                    <>
                                        <p>Adding...</p>
                                    </>
                                ) : (
                                    "Add to inventory"
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Add new model */}
                <div className="add-information-container">
                    <form onSubmit={handleModelSubmit}>
                        <div className="input-container">
                            <h1>Add New Product Model 📱</h1>
                            <div className="input-container-box">
                                <label>
                                    <p>PRODUCT NAME</p>
                                    <input
                                        type="text"
                                        name="productName"
                                        placeholder="PRODUCT NAME..."
                                        value={modelForm.productName}
                                        onChange={(e) =>
                                            setModelForm({
                                                ...modelForm,
                                                productName: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                                <label>
                                    <p>BARCODE ID</p>
                                    <input
                                        type="text"
                                        name="barcodeId"
                                        placeholder="BARCODE ID..."
                                        value={modelForm.barcodeId}
                                        onChange={(e) =>
                                            setModelForm({
                                                ...modelForm,
                                                barcodeId: e.target.value,
                                            })
                                        }
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="submit-btn model">
                            <button type="submit">
                                {modelLoading ? (
                                    <>
                                        <p>Adding...</p>
                                    </>
                                ) : (
                                    "Add New Model"
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lookup Function */}
                <div className="lookup-container">
                    <h1>SEARCH FOR YOUR SERIAL NUMBER 🔎</h1>
                    <input
                        type="text"
                        value={searchSerial}
                        onChange={(e) => setSearchSerial(e.target.value.toUpperCase())}
                        placeholder="Enter serial number"
                    />
                    <button onClick={handleSearch}>
                        {loading.search ? (
                            <>
                                <p>Searching...</p>
                            </>
                        ) : (
                            "Search"
                        )}
                    </button>
                    {searchResult ? (
                        <div className="search-results">
                            <h3>Details for {searchResult.serial_number}</h3>
                            <p>
                                <strong>Item:</strong> {searchResult.item}
                            </p>
                            <p className="search-customer">
                                <strong>Customer:</strong>{" "}
                                {searchResult.customer}
                            </p>
                            <p>
                                <strong>Invoice No:</strong>{" "}
                                {searchResult.invoice_no}
                            </p>
                            <p>
                                <strong>Invoice Date:</strong>{" "}
                                {searchResult.invoice_date}
                            </p>
                        </div>
                    ) : (
                        searchSerial && (
                            <p className="search-error">
                                {loading
                                    ? ""
                                    : `No result found for ${searchSerial}`}
                            </p>
                        )
                    )}
                </div>

                {/* Display inventory */}
                <div className="table-container">
                    <h4>All Products 📦</h4>
                    <div className="tb-info-row">
                        <p className="total-products">
                            Total Entries: {inventory.length}
                        </p>
                        <select id="backupFormat">
                            <option value="csv">CSV</option>
                            <option value="pdf">PDF</option>
                        </select>
                        <button onClick={handleBackup}>Backup</button>
                    </div>
                    <table border="1">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Serial Number</th>
                                <th>Customer</th>
                                <th>Invoice No</th>
                                <th>Invoice Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory
                                .slice()
                                .sort(
                                    (a, b) =>
                                        new Date(b.invoice_date) -
                                        new Date(a.invoice_date)
                                )
                                .slice()
                                .map((data) => (
                                    <tr key={data.id}>
                                        <td>{data.item}</td>
                                        <td>{data.serial_number}</td>
                                        <td>{data.customer}</td>
                                        <td>{data.invoice_no}</td>
                                        <td>{data.invoice_date}</td>
                                        <td>
                                            <button
                                                className="del-btn"
                                                onClick={() =>
                                                    deleteEntry(data.id)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

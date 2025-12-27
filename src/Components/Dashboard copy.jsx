import '../index.css';
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import "jspdf-autotable";
import {
    Plus,
    Trash,
    Search,
    Package,
    Users,
    Download,
    Table,
    LogOut,
    LoaderIcon,
    LoaderCircle,
} from "lucide-react";
import { supabase } from "../utils/supabase";
import InventoryTable from './InventoryTable';

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
    const [tempSearchSerial, setTempSearchSerial] = useState("");
    const [searchResult, setSearchResult] = useState(null);

    const [dropDownData, setDropDownData] = useState({});
    const [activeField, setActiveField] = useState(null);

    const [loading, setLoading] = useState({
        inventory: false,
        search: false,
        table: false,
    });

    const [activeSegment, setActiveSegment] = useState("customer");
    const navigate = useNavigate();
    const user_username = localStorage.getItem("username");

    const [modelForm, setModelForm] = useState({
        productName: "",
        barcodeId: "",
    });
    const [modelLoading, setModelLoading] = useState(false);
    const [backupCustomer, setBackupCustomer] = useState("");
    const [filteredTableLength, setFilteredTableLength] = useState(null);

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

    useEffect(() => {
        const fetchInventory = async () => {
            const { data, error } = await supabase
                .from("inventorynew")
                .select("*");
            if (error) {
                console.error("Error fetching inventory:", error.message);
            } else {
                setInventory(data);
                setFilteredTableLength(data.length);
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
        }
    };

    const handleCustomerBackupChange = (e) => {
        const { name, value } = e.target;
        setBackupCustomer(value);

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
        }
    };

    const handleSelectItem = (name, value) => {
        setForm((prevForm) => ({ ...prevForm, [name]: value }));
        setActiveField(null);
    };

    const handleSelectItemBackup = (name, value) => {
        setBackupCustomer(value);
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
                return;
            }
        } else {
            alert("Please fill in all the blanks.");
            return;
        }
    };

    const handleSubmit = async () => {
        setLoading((prev) => ({ ...prev, inventory: true }));

        try {
            let newEntries = [];

            form.serialNumber.forEach((serial, index) => {
                const parts = serial.split("-");
                if (parts.length !== 2 || isNaN(parts[1])) {
                    alert(`Invalid serial number format: ${serial}`);
                    setLoading((prev) => ({ ...prev, inventory: false }));
                    return;
                }

                const prefix = parts[0];
                const baseNumber = Number.parseInt(parts[1], 10);
                const quantity = form.quantity[index];
                const itemName = form.item[index];

                for (let i = 0; i < quantity; i++) {
                    const uniqueSerial = `${prefix}-${baseNumber + i}`;
                    newEntries.push({
                        item: itemName,
                        serial_number: uniqueSerial,
                        customer: form.customer,
                        invoice_no: form.invoiceNo,
                        invoice_date: form.invoiceDate,
                    });
                }
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
                setLoading((prev) => ({ ...prev, inventory: false }));
                return;
            }

            const existingSerials = new Set(
                existingData.map((item) => item.serial_number)
            );
            newEntries = newEntries.filter(
                (entry) => !existingSerials.has(entry.serial_number)
            );

            if (newEntries.length === 0) {
                alert(
                    "All serial numbers already exist. No new entries were added."
                );
                setLoading((prev) => ({ ...prev, inventory: false }));
                return;
            }

            const { data, error } = await supabase
                .from("inventorynew")
                .insert(newEntries)
                .select();

            if (error) {
                console.error("Error inserting data:", error.message);
                setLoading((prev) => ({ ...prev, inventory: false }));
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
                setLoading((prev) => ({ ...prev, inventory: false }));
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
            setLoading((prev) => ({ ...prev, inventory: false }));
        }
    };

    const handleModelSubmit = async (e) => {
        e.preventDefault();

        if (!modelForm.productName || !modelForm.barcodeId) {
            alert("Please fill in all fields");
            return;
        }

        setModelLoading(true);

        try {
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
        const [serialPart, qtyPart] = serialInput.split("_");

        const newSerialNumbers = [...form.serialNumber];
        const newQuantities = [...form.quantity];
        const newItem = [...form.item];

        newSerialNumbers[index] = serialPart;

        if (qtyPart) {
            newQuantities[index] = Number(qtyPart);
        } else {
            newQuantities[index] = Number(1);
        }

        setForm((prevForm) => ({
            ...prevForm,
            serialNumber: newSerialNumbers,
            quantity: newQuantities,
        }));

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
                setForm((prevForm) => ({ ...prevForm, item: newItem }));
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
            item: [...form.item, ""],
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
            item: newItem,
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
        if (!tempSearchSerial.trim()) {
            setTempSearchSerial(null);
            return;
        }

        setLoading((prev) => ({ ...prev, search: true }));

        const { data, error } = await supabase
            .from("inventorynew")
            .select("*")
            .eq("serial_number", tempSearchSerial.trim());

        if (error) {
            console.error("Error searching for serial number:", error.message);
            setLoading((prev) => ({ ...prev, search: false }));
        } else {
            setSearchResult(data.length > 0 ? data[0] : null);
            setSearchSerial(data.length > 0 ? false : "Not found");
            setLoading((prev) => ({ ...prev, search: false }));
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
        let numRows = inventory.length;

        // Dynamically filter, sort, and select
        const selectedEntries = inventory
            .filter((entry) => {
                // Filter by customer if specified
                const customerMatch = backupCustomer
                    ? entry.customer.toLowerCase() === backupCustomer.toLowerCase()
                    : true;

                // Filter by date if specified
                const dateMatch = fromDate && toDate
                    ? new Date(entry.invoice_date) >= new Date(fromDate) &&
                    new Date(entry.invoice_date) <= new Date(toDate)
                    : true;

                return customerMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
            .slice(0, numRows);


        if (!fromDate || !toDate) {
            numRows = Number.parseInt(
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
        }

        // Handle empty results
        if (selectedEntries.length === 0) {
            alert("No records found for the selected criteria.");
            return;
        }

        // Generate CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Item,Serial Number,Customer,Invoice No,Invoice Date\n";

        selectedEntries.forEach((row) => {
            csvContent += `${row.item},${row.serial_number},${row.customer},${row.invoice_no},${row.invoice_date}\n`;
        });

        // Trigger download
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute(
            "href",
            encodedUri
        );

        const customerPart = backupCustomer || "all";
        link.setAttribute(
            "download",
            `inventory_backup_${customerPart}_${selectedEntries.length}_rows.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    };

    const backupPDF = () => {
        let numRows = inventory.length;

        // Dynamically filter, sort, and select
        const selectedEntries = inventory
            .filter((entry) => {
                // Filter by customer if specified
                const customerMatch = backupCustomer
                    ? entry.customer.toLowerCase() === backupCustomer.toLowerCase()
                    : true;

                // Filter by date if specified
                const dateMatch = fromDate && toDate
                    ? new Date(entry.invoice_date) >= new Date(fromDate) &&
                    new Date(entry.invoice_date) <= new Date(toDate)
                    : true;

                return customerMatch && dateMatch;
            })
            .sort((a, b) => new Date(b.invoice_date) - new Date(a.invoice_date))
            .slice(0, numRows);


        if (!fromDate || !toDate) {
            numRows = Number.parseInt(
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
        }

        if (selectedEntries.length === 0) {
            alert("No records found for the selected criteria.");
            return;
        }

        // PDF generation
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

        selectedEntries.forEach((row) => {
            if (y + 10 > pageHeight - 10) {
                doc.addPage();
                y = marginTop + 10;
                addHeaders();
            }

            doc.text(row.item, 10, y);
            doc.text(row.serial_number, 50, y);
            doc.text(row.customer, 100, y);
            doc.text(row.invoice_no, 150, y);
            doc.text(row.invoice_date, 180, y);
            y += 10;
        });

        // Save file
        const customerPart = backupCustomer || "all";
        doc.save(`inventory_backup_${customerPart}_${selectedEntries.length}_rows.pdf`);

    };

    const segments = [
        { id: "customer", label: "Customer", icon: Users },
        { id: "products", label: "Products", icon: Package },
        { id: "search", label: "Search", icon: Search },
        { id: "backups", label: "Backups", icon: Download },
        { id: "table", label: "Table", icon: Table },
    ];

    // DATE PICKER
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const handleFromChange = (e) => setFromDate(e.target.value);
    const handleToChange = (e) => setToDate(e.target.value);

    const todayDate = new Date().toISOString().split('T')[0];

    return (
        <div className="min-h-screen bg-base-300">
            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-12">
                    <div className="animate-fade-in">
                        <h1 className="text-4xl font-semibold text-base-content mb-2">
                            Welcome back,{" "}
                            <span className="text-primary">
                                {user_username}
                            </span>
                        </h1>
                        <p className="text-base-content/60 text-lg">
                            Manage your inventory with ease
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-6 py-3 bg-red-900 backdrop-blur-xl border border-base-300/30 rounded-2xl text-red-200 hover:text-red-200 hover:bg-red-950 transition-all duration-200"
                    >
                        <LogOut size={18} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>

                {/* Navigation */}
                <div className="mb-12 animate-slide-up">
                    <div className="flex flex-wrap gap-2 p-2 bg-base-100/30 backdrop-blur-xl rounded-3xl border border-base-300/20">
                        {segments.map((segment) => {
                            const Icon = segment.icon;
                            return (
                                <button
                                    key={segment.id}
                                    onClick={() => {
                                        setActiveSegment(segment.id)
                                        setLoading((prev) => ({
                                            ...prev,
                                            table: true,
                                        }));
                                        setTimeout(() => {
                                            setLoading((prev) => ({
                                                ...prev,
                                                table: false,
                                            }))
                                        }, 1000);
                                    }}
                                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-medium transition-all duration-200 ${activeSegment === segment.id
                                            ? "bg-primary text-white shadow-lg transform scale-[1.02]"
                                            : "text-base-content/70 hover:text-base-content hover:bg-base-100"
                                        }`}
                                >
                                    <Icon size={18} />
                                    <span>{segment.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content Sections */}
                <div className="animate-scale-in">
                    {/* Customer Section */}
                    {activeSegment === "customer" && (
                        <div className="space-y-8">
                            <form
                                onSubmit={handleConfirmSubmit}
                                className="space-y-8"
                            >
                                {/* Customer Information */}
                                <div className="bg-base-100/50 backdrop-blur-sm rounded-3xl p-8 border border-base-300/20 shadow-xl relative z-9">
                                    <h2 className="text-2xl font-semibold text-base-content mb-8">
                                        Product Information
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        {["customer"].map((field) => (
                                            <div
                                                key={field}
                                                className="relative z-10"
                                            >
                                                <label className="block text-sm font-medium text-base-content/80 mb-3 ml-2">
                                                    Customer Name
                                                </label>
                                                <input
                                                    type="text"
                                                    name={field}
                                                    placeholder="Enter customer name"
                                                    className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                    value={form[field]}
                                                    onChange={handleInputChange}
                                                    onBlur={() =>
                                                        setTimeout(
                                                            () =>
                                                                setActiveField(
                                                                    null
                                                                ),
                                                            100
                                                        )
                                                    }
                                                />
                                                {activeField === field &&
                                                    dropDownData[field]
                                                        ?.length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 mt-2 bg-base-300 backdrop-blur-sm border border-base-300/30 rounded-2xl shadow-2xl overflow-hidden">
                                                            {dropDownData[field]
                                                                .slice(0, 5)
                                                                .map(
                                                                    (
                                                                        item,
                                                                        index
                                                                    ) => (
                                                                        <button
                                                                            key={
                                                                                index
                                                                            }
                                                                            type="button"
                                                                            onClick={() =>
                                                                                handleSelectItem(
                                                                                    field,
                                                                                    item
                                                                                )
                                                                            }
                                                                            className="w-full px-4 py-3 text-left hover:bg-base-100 transition-colors duration-150"
                                                                        >
                                                                            {
                                                                                item
                                                                            }
                                                                        </button>
                                                                    )
                                                                )}
                                                        </div>
                                                    )}
                                            </div>
                                        ))}
                                        <div>
                                            <label className="block text-sm font-medium text-base-content/80 mb-3 ml-2">
                                                Invoice Number
                                            </label>
                                            <input
                                                type="text"
                                                name="invoiceNo"
                                                placeholder="Enter invoice number"
                                                className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                value={form.invoiceNo}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-base-content/80 mb-3 ml-2">
                                                Invoice Date
                                            </label>
                                            <input
                                                type="date"
                                                name="invoiceDate"
                                                className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                value={form.invoiceDate}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Serial Numbers */}
                                <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/20 shadow-xl relative z-0">
                                    <h2 className="text-2xl font-semibold text-base-content mb-8">
                                        Serial Numbers
                                    </h2>
                                    <div className="space-y-6">
                                        {form.serialNumber.map(
                                            (serial, index) => (
                                                <div
                                                    key={index}
                                                    className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
                                                >
                                                    <div>
                                                        <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                            Serial Number #
                                                            {index + 1}
                                                        </label>
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={serial}
                                                                onChange={(e) =>
                                                                    handleSerialNumberChange(
                                                                        e,
                                                                        index
                                                                    )
                                                                }
                                                                placeholder={`Serial number ${index + 1
                                                                    }`}
                                                                className="w-full flex-1 px-4 py-4 bg-accent/10 border border-accent/30 rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-200"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    processSerialNumber(
                                                                        index
                                                                    )
                                                                }
                                                                className="px-4 py-4 bg-accent hover:bg-accent/90 text-white rounded-2xl transition-all duration-200 transform hover:scale-105"
                                                            >
                                                                <Plus
                                                                    size={18}
                                                                />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className='ml-0 lg:ml-3'>
                                                        <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                            Model
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={
                                                                form.item[index]
                                                            }
                                                            readOnly
                                                            placeholder="Model will appear here"
                                                            className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                            Quantity
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={
                                                                form.quantity[
                                                                index
                                                                ] || ""
                                                            }
                                                            onChange={(e) =>
                                                                handleQuantityChange(
                                                                    e,
                                                                    index
                                                                )
                                                            }
                                                            max={40}
                                                            placeholder="Qty"
                                                            className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                        />
                                                    </div>
                                                    {form.serialNumber.length >
                                                        1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleDeleteSerialQ(
                                                                        index
                                                                    )
                                                                }
                                                                className="px-5 py-5 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-2xl transition-all duration-200 w-fit"
                                                            >
                                                                <Trash size={18} />
                                                            </button>
                                                        )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddSerialQ}
                                        className="mt-8 px-6 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-500 border border-green-500/30 rounded-2xl font-medium transition-all duration-200"
                                    >
                                        Add Serial Number
                                    </button>
                                </div>

                                {/* Submit Button */}
                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        disabled={loading.inventory}
                                        className="px-12 py-4 bg-red-500 hover:bg-red-500/90 disabled:bg-red-500/50 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg"
                                    >
                                        {loading.inventory ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Adding to Inventory
                                            </div>
                                        ) : (
                                            "Add to Inventory"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Products Section */}
                    {activeSegment === "products" && (
                        <div className="space-y-8">
                            <form
                                onSubmit={handleModelSubmit}
                                className="space-y-8"
                            >
                                <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/20 shadow-xl">
                                    <h2 className="text-2xl font-semibold text-base-content mb-8">
                                        Add New Product Model
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                Product Name
                                            </label>
                                            <input
                                                type="text"
                                                name="productName"
                                                placeholder="Enter product name"
                                                className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                value={modelForm.productName}
                                                onChange={(e) =>
                                                    setModelForm({
                                                        ...modelForm,
                                                        productName:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                Barcode ID
                                            </label>
                                            <input
                                                type="text"
                                                name="barcodeId"
                                                placeholder="Enter barcode ID"
                                                className="w-full px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                value={modelForm.barcodeId}
                                                onChange={(e) =>
                                                    setModelForm({
                                                        ...modelForm,
                                                        barcodeId:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <button
                                        type="submit"
                                        disabled={modelLoading}
                                        className="px-12 py-4 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg"
                                    >
                                        {modelLoading ? (
                                            <div className="flex items-center gap-3">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Adding Model...
                                            </div>
                                        ) : (
                                            "Add New Model"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Search Section */}
                    {activeSegment === "search" && (
                        <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/20 shadow-xl">
                            <h2 className="text-2xl font-semibold text-base-content mb-8">
                                Search Serial Number
                            </h2>
                            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                                <input
                                    type="text"
                                    value={tempSearchSerial}
                                    onChange={(e) =>
                                        setTempSearchSerial(
                                            e.target.value.toUpperCase()
                                        )
                                    }
                                    onFocus={() => setSearchSerial(false)}
                                    placeholder="Enter serial number to search"
                                    className="flex-1 px-4 py-4 bg-base-200/50 border-2 border-accent/25 rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all duration-200"
                                />
                                <button
                                    onClick={handleSearch}
                                    disabled={loading.search}
                                    className="px-8 py-4 bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:scale-100"
                                >
                                    {loading.search ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Searching...
                                        </div>
                                    ) : (
                                        "Search"
                                    )}
                                </button>
                            </div>

                            {searchResult ? (
                                <div className="bg-accent/10 border border-accent/30 rounded-2xl p-6">
                                    <h3 className="text-lg font-semibold text-base-content mb-4">
                                        Details for {searchResult.serial_number}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-base-content/60">
                                                Item:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {searchResult.item}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-base-content/60">
                                                Customer:
                                            </span>
                                            <span className="ml-2 font-medium text-primary">
                                                {searchResult.customer}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-base-content/60">
                                                Invoice No:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {searchResult.invoice_no}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-base-content/60">
                                                Invoice Date:
                                            </span>
                                            <span className="ml-2 font-medium">
                                                {searchResult.invoice_date}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                searchSerial &&
                                !loading.search && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
                                        <p className="text-red-500">
                                            No result found for "{tempSearchSerial}"
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    )}

                    {/* Backups Section */}
                    {activeSegment === "backups" && (
                        <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/20 shadow-xl">
                            <h2 className="text-2xl font-semibold text-base-content mb-8">
                                Backup Data
                            </h2>

                            <div className="space-y-8">
                                <div className="flex w-fit bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-green-500">
                                            {inventory.length}
                                        </div>
                                        <div className="text-base-content/60">
                                            Total Entries
                                        </div>
                                    </div>
                                </div>

                                <div className="relative">
                                    {/* FILTER BY CUSTOMER */}
                                    {["customer"].map((field) => (
                                        <div key={field}>
                                            <label className="block text-sm font-medium text-base-content/80 mb-3">
                                                Filter by Customer (Optional)
                                            </label>
                                            <input
                                                type="text"
                                                name={field}
                                                placeholder="Enter customer name to filter"
                                                className="w-full max-w-sm px-4 py-4 bg-base-200/50 border-2 border-neutral rounded-2xl text-base-content placeholder-base-content/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                                value={backupCustomer}
                                                onChange={
                                                    handleCustomerBackupChange
                                                }
                                                onBlur={() =>
                                                    setTimeout(
                                                        () =>
                                                            setActiveField(
                                                                null
                                                            ),
                                                        1000
                                                    )
                                                }
                                            />
                                            {activeField === field &&
                                                dropDownData[field]?.length >
                                                0 && (
                                                    <div className="absolute top-full left-0 right-0 max-w-sm z-50 mt-2 bg-base-300 backdrop-blur-xl border border-base-300/30 rounded-2xl shadow-2xl overflow-hidden">
                                                        {dropDownData[field]
                                                            .slice(0, 5)
                                                            .map(
                                                                (
                                                                    item,
                                                                    index
                                                                ) => (
                                                                    <button
                                                                        key={
                                                                            index
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleSelectItemBackup(
                                                                                field,
                                                                                item
                                                                            )
                                                                        }
                                                                        className="w-full px-4 py-3 text-left hover:bg-base-100 transition-colors duration-150"
                                                                    >
                                                                        {item}
                                                                    </button>
                                                                )
                                                            )}
                                                    </div>
                                                )}
                                        </div>
                                    ))}
                                </div>

                                <label>
                                    <p className='mb-3 text-sm'>Filter by date (Optional)</p>
                                </label>
                                <div className="flex flex-col gap-4 max-w-sm w-full">
                                    <div>
                                        <label className="label">
                                            <span className="label-text text-sm">From</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={fromDate}
                                            onChange={handleFromChange}
                                            className="rounded-xl input input-bordered w-full"
                                            max={todayDate}
                                        />
                                    </div>

                                    <div>
                                        <label className="label">
                                            <span className="label-text text-sm">To</span>
                                        </label>
                                        <input
                                            type="date"
                                            value={toDate}
                                            onChange={handleToChange}
                                            className="rounded-xl input input-bordered w-full"
                                            min={fromDate} // ensures "to" can't be earlier than "from"
                                            max={todayDate}
                                        />
                                    </div>

                                    <div>
                                        <p className="text-sm">
                                            Selected range: {<span className='font-bold'>{fromDate}</span> || "-"} to {<span className='font-bold'>{toDate}</span> || "-"}
                                        </p>
                                    </div>
                                </div>

                                <div className="max-w-sm w-full flex flex-col sm:flex-row gap-4">
                                    <select
                                        id="backupFormat"
                                        className="px-4 py-4 bg-base-200/50 border border-neutral rounded-2xl text-base-content focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200"
                                    >
                                        <option className='bg-base-200' value="csv">CSV Format</option>
                                        <option className='bg-base-200' value="pdf">PDF Format</option>
                                    </select>
                                    <button
                                        onClick={handleBackup}
                                        className="w-full px-8 py-4 bg-neutral hover:bg-neutral/90 text-white font-semibold rounded-2xl transition-all duration-200 transform hover:scale-105"
                                    >
                                        Download Backup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table Section */}
                    {activeSegment === "table" && (
                        <div className="bg-base-100/50 backdrop-blur-xl rounded-3xl p-8 border border-base-300/20 shadow-xl">
                            <h2 className="text-2xl font-semibold text-base-content mb-8">
                                Inventory Table
                            </h2>

                            <div className="flex mb-8">
                                <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-green-500">
                                            {inventory.length}
                                        </div>
                                        <div className="text-base-content/60 text-sm">
                                            Total Entries
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TABLE */}
                            {loading.table ? (
                                <p className='flex items-center gap-2'><LoaderCircle className='animate-spin' /> Loading...</p>
                            ) : (
                                <InventoryTable inventory={inventory} deleteEntry={deleteEntry} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
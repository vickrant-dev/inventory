import React, { useState, useRef, useEffect } from "react";

interface InventoryItem {
    id: string | number;
    item: string;
    serial_number: string;
    customer: string;
    invoice_no: string;
    invoice_date: string;
}

interface InventoryTableProps {
    inventory: InventoryItem[];
    deleteEntry: (id: string | number) => void;
}

const BATCH_SIZE = 50; // number of rows to render at a time

const InventoryTable: React.FC<InventoryTableProps> = ({ inventory, deleteEntry }) => {
    const sortedItems = React.useMemo(
        () =>
            [...inventory].sort(
                (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
            ),
        [inventory]
    );

    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleScroll = () => {
        if (!containerRef.current) return;
        const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            // Near bottom, load more
            setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, sortedItems.length));
        }
    };

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [sortedItems]);

    return (
        <div className="w-full border border-neutral/30 rounded-lg overflow-hidden">
            <div
                style={{ maxHeight: 500, overflowY: "auto" }}
                className="w-full"
                ref={containerRef}
            >
                <table className="w-full border-collapse">
                    <thead className="bg-base-300 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Item</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Serial Number</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Customer</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Invoice No</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Invoice Date</th>
                            <th className="px-6 py-4 text-left text-sm font-semibold text-base-content/80">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral/30">
                        {sortedItems.slice(0, visibleCount).map((item) => (
                            <tr key={item.id} className="hover:bg-base-200/30 transition-colors duration-150">
                                <td className="px-6 py-4 text-sm text-base-content">{item.item}</td>
                                <td className="px-6 py-4 text-sm font-mono text-base-content">{item.serial_number}</td>
                                <td className="px-6 py-4 text-sm text-primary font-medium">{item.customer}</td>
                                <td className="px-6 py-4 text-sm text-base-content">{item.invoice_no}</td>
                                <td className="px-6 py-4 text-sm text-base-content">{item.invoice_date}</td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => deleteEntry(item.id)}
                                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 rounded-xl text-sm font-medium"
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

    );
};

export default InventoryTable;

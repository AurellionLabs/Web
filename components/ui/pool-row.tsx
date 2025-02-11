'use client';
import Link from 'next/link';
import { colors } from '@/lib/constants/colors';
import { getDecimal, OperationData } from '@/dapp-connectors/staking-controller';
import { useState, useEffect } from 'react';
import { formatEthereumValue } from '@/dapp-connectors/ethereum-utils';
import { usePoolsProvider } from '@/app/providers/pools.provider';

interface PoolRowProps {
    operation: OperationData;
    index: number;
}
const formatDaysLeft = (deadline: number) => {
    const now = Math.floor(Date.now() / 1000);
    const daysLeft = Math.max(0, Math.floor((deadline - now) / 86400));
    return daysLeft.toString();
};
export function PoolRow({ operation, index }: PoolRowProps) {
    const { setSelectedPool } = usePoolsProvider();
    const [decimals, setDecimals] = useState(0);
    const [formattedValues, setFormattedValues] = useState({
        tokenTvl: '0',
        reward: '0',
        lengthInDays: '0',
    });

    const handleClick = () => {
        setSelectedPool(operation);
    };

    useEffect(() => {
        const _getDecimal = async () => {
            setDecimals(Number(await getDecimal()))
        }
        _getDecimal()
    }, []);
    useEffect(() => {
        setFormattedValues({
            tokenTvl: formatEthereumValue(operation.tokenTvl,decimals),
            reward: (Number(operation.reward) / 100).toFixed(2),
            lengthInDays: formatDaysLeft(Number(operation.deadline)) || '0',
        });
    }, [operation]);

    return (
        <tr
            className={`border-b border-[${colors.neutral[800]}] hover:bg-[${colors.neutral[800]}]/50 transition-colors`}
        >
            <td className={`py-4 px-4 text-[${colors.text.secondary}]`}>{index}</td>
            <td className="py-4 px-4">
                <Link
                    href={`/pools/${operation.id}`}
                    className={`flex items-center gap-2 hover:text-[${colors.primary[500]}]`}
                    onClick={handleClick}
                >
                    <div className="flex -space-x-1">
                        <div className="w-6 h-6 rounded-full bg-amber-600 border-2 border-gray-900" />
                        <div className="w-6 h-6 rounded-full bg-red-700 border-2 border-gray-900" />
                    </div>
                    <span>{operation.name}</span>
                    <span className="text-green-500 text-sm">
                        {formattedValues.reward}%
                    </span>
                </Link>
            </td>
            <td className="py-4 px-4 text-right">{formattedValues.tokenTvl}</td>
            <td className="py-4 px-4 text-right text-green-500">
                {formattedValues.reward}%
            </td>
            <td className="py-4 px-4 text-right">{formattedValues.tokenTvl}</td>
        </tr>
    );
}

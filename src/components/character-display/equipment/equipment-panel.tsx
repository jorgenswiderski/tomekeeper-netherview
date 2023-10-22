// equipment-panel.tsx
import React, { useCallback, useMemo } from 'react';
import { Typography, Grid, Box } from '@mui/material';
import styled from '@emotion/styled';
import {
    EquipmentItemType,
    EquipmentSlot,
    IEquipmentItem,
} from 'planner-types/src/types/equipment-item';
import { EquipmentSlotCard } from './equipment-slot';
import { ICharacter } from '../../../models/character/types';

const MainContainer = styled(Box)`
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
`;

const TopContainer = styled(Box)`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

const Column = styled(Box)`
    display: flex;
    flex-direction: column;
`;

const BottomContainer = styled(Box)`
    display: flex;
    justify-content: space-between;
    width: 100%;
`;

const WeaponContainer = styled(Box)`
    display: flex;
`;

const StyledGrid = styled(Grid)`
    margin: 8px;
`;

interface EquipmentPanelProps {
    character: ICharacter;
    onCharacterChanged: (character: ICharacter) => void;
}

export function EquipmentPanel({
    character,
    onCharacterChanged,
}: EquipmentPanelProps) {
    const items = useMemo(() => character.getEquipment(), [character]);

    const onEquipItem = useCallback(
        (slot: EquipmentSlot, item: IEquipmentItem) => {
            const newCharacter = character.equipItem(slot, item);
            onCharacterChanged(newCharacter);
        },
        [character],
    );

    const isSlotDisabled = useCallback(
        (slot: EquipmentSlot): boolean => {
            if (slot === EquipmentSlot.RangedOffhand) {
                return (
                    typeof items[EquipmentSlot.RangedMainhand] !==
                        'undefined' &&
                    items[EquipmentSlot.RangedMainhand].item.type !==
                        EquipmentItemType['Hand Crossbows']
                );
            }

            return false;
        },
        [items],
    );

    const equipmentSlots = Object.keys(EquipmentSlot)
        .filter((key) => !Number.isNaN(Number(EquipmentSlot[key as any])))
        .map((key) => EquipmentSlot[key as keyof typeof EquipmentSlot]);

    return (
        <>
            <Typography variant="h6" align="left" gutterBottom>
                Equipped Items:
            </Typography>
            <MainContainer>
                <TopContainer>
                    <Column>
                        {equipmentSlots.slice(0, 4).map((slot) => (
                            <StyledGrid item key={slot}>
                                <EquipmentSlotCard
                                    slot={slot}
                                    onEquipItem={(item: IEquipmentItem) =>
                                        onEquipItem(slot, item)
                                    }
                                    item={items[slot]?.item}
                                    disabled={isSlotDisabled(slot)}
                                />
                            </StyledGrid>
                        ))}
                    </Column>
                    <Column>
                        {equipmentSlots.slice(4, 8).map((slot) => (
                            <StyledGrid item key={slot}>
                                <EquipmentSlotCard
                                    slot={slot}
                                    onEquipItem={(item: IEquipmentItem) =>
                                        onEquipItem(slot, item)
                                    }
                                    item={items[slot]?.item}
                                    disabled={isSlotDisabled(slot)}
                                />
                            </StyledGrid>
                        ))}
                    </Column>
                </TopContainer>
                <BottomContainer>
                    <WeaponContainer>
                        {equipmentSlots.slice(8, 10).map((slot) => (
                            <StyledGrid item key={slot}>
                                <EquipmentSlotCard
                                    slot={slot}
                                    onEquipItem={(item: IEquipmentItem) =>
                                        onEquipItem(slot, item)
                                    }
                                    item={items[slot]?.item}
                                    disabled={isSlotDisabled(slot)}
                                />
                            </StyledGrid>
                        ))}
                    </WeaponContainer>

                    <WeaponContainer>
                        {equipmentSlots.slice(10, 12).map((slot) => (
                            <StyledGrid item key={slot}>
                                <EquipmentSlotCard
                                    slot={slot}
                                    onEquipItem={(item: IEquipmentItem) =>
                                        onEquipItem(slot, item)
                                    }
                                    item={items[slot]?.item}
                                    disabled={isSlotDisabled(slot)}
                                />
                            </StyledGrid>
                        ))}
                    </WeaponContainer>
                </BottomContainer>
            </MainContainer>
        </>
    );
}
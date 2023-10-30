import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { ICharacterOption } from '@jorgenswiderski/tomekeeper-shared/dist/types/character-feature-customization-option';
import { useRouter } from 'next/router';
import {
    Box,
    Button,
    CircularProgress,
    Paper,
    Typography,
} from '@mui/material';
import { Character } from '../../models/character/character';
import {
    IPendingDecision,
    CharacterDecisionInfo,
} from '../../models/character/character-states';
import FeaturePicker from './feature-picker/feature-picker';
import CharacterDisplay from '../character-display/character-display';
import TreeVisualization from '../tree-visualization';
import SettingsMenu from '../character-display/settings-menu/settings-menu';
import { LevelUp } from './level-up';
import { useCharacter } from '../../context/character-context/character-context';

const Container = styled(Box)`
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    gap: 40px;

    position: relative;
    margin: auto 0;
    width: 100%;
    height: 100%;
    min-height: 100%;

    @media (max-width: 768px) {
        flex-direction: column-reverse;
        gap: 1rem;
    }
`;

const ButtonBox = styled(Box)`
    position: absolute;
    top: 10px;
    right: 10px;
    cursor: pointer;
    width: 100%;
    padding: 0 2rem;
    box-sizing: border-box;

    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;

    @media (max-width: 768px) {
        position: static;
        margin-bottom: 1rem;
        width: 100%;
    }
`;

const DevButton = styled(Button)`
    @media (max-width: 768px) {
        flex: 1;
    }
`;

const PaperContainer = styled(Paper)`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    gap: 1rem;

    @media (max-width: 768px) {
        width: 100%;
        box-sizing: border-box;
    }
`;

const PlannerContainer = styled(PaperContainer)`
    flex: 1;

    max-width: 600px;
    position: relative;
`;

const PlannerHeader = styled(Paper)`
    width: 100%;
    text-align: center;
    padding: 1rem;
    box-sizing: border-box;
`;

const TreeVisualizationOverlay = styled(TreeVisualization)`
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 10; // Ensures it's above other content
`;

const StyledSettingsMenu = styled(SettingsMenu)`
    position: absolute;
    top: 10px;
    right: 10px;
`;

interface CharacterPlannerProps {
    character: Character;
}

export default function CharacterPlanner({ character }: CharacterPlannerProps) {
    const router = useRouter();
    const { build, setCharacter } = useCharacter();

    const [isTreeVisible, setIsTreeVisible] = useState(false);
    const [loading] = useState(false);

    const nextDecision = useMemo(
        () => character.pendingDecisions[0],
        [character],
    );

    const nextDecisionInfo = useMemo(
        () => (nextDecision ? CharacterDecisionInfo[nextDecision.type] : null),
        [nextDecision],
    );

    useEffect(() => {
        if (
            character.pendingDecisions.length < 2 &&
            character.pendingSteps.length
        ) {
            character.queueNextStep().then((char) => {
                if (char) {
                    setCharacter(char);
                }
            });
        }
    }, [character]);

    useEffect(() => {
        if (
            character.replayNodes &&
            character.pendingDecisions.length === 0 &&
            character.pendingSteps.length === 0
        ) {
            setCharacter(character.progressReplay());
        }
    }, [character]);

    const handleDecision = useCallback(
        (
            decision: IPendingDecision,
            choices: ICharacterOption | ICharacterOption[],
        ) => {
            const newCharacter = character.makeDecision(decision, choices);
            setCharacter(newCharacter);
        },
        [character],
    );

    const levelUpCharacter = useCallback(() => {
        const newCharacter = character.levelUp();
        setCharacter(newCharacter);
    }, [character]);

    useEffect(() => {
        if (build?.id) {
            router.push('/', `/share/${build.id}`, {
                shallow: true,
            });
        }
    }, [build?.id]);

    const handleReset = () => {
        router.reload();
    };

    const renderDecisionPanel = () => {
        if (!nextDecision) {
            if (character.canLevel()) {
                return <LevelUp onClick={levelUpCharacter} />;
            }

            return null;
        }

        if (!nextDecisionInfo) {
            return (
                <Typography variant="h4" color="error">
                    {`Warning: No decision info for '${nextDecision.type}'.`}
                </Typography>
            );
        }

        if (
            loading ||
            (character.pendingDecisions.length === 0 &&
                character.pendingSteps.length)
        ) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100vh',
                    }}
                >
                    <CircularProgress />
                </Box>
            );
        }

        return (
            <>
                <PlannerHeader elevation={2}>
                    <Typography variant="h4">
                        {nextDecisionInfo.title}
                    </Typography>
                </PlannerHeader>
                {nextDecisionInfo.render ? (
                    nextDecisionInfo.render({
                        onDecision: handleDecision,
                        decision: nextDecision,
                        character,
                    })
                ) : (
                    <FeaturePicker
                        onDecision={handleDecision}
                        decision={nextDecision}
                        {...nextDecisionInfo.extraFeaturePickerArgs}
                    />
                )}
            </>
        );
    };

    return (
        <>
            <ButtonBox>
                <StyledSettingsMenu />
                <DevButton
                    variant="contained"
                    color="primary"
                    onClick={() => setIsTreeVisible(!isTreeVisible)}
                >
                    Toggle Tree
                </DevButton>

                <DevButton
                    variant="contained"
                    color="primary"
                    onClick={handleReset}
                >
                    Reset
                </DevButton>
            </ButtonBox>
            {isTreeVisible ? (
                <TreeVisualizationOverlay data={character.root} />
            ) : (
                <Container>
                    {character.root.children && // FIXME
                        character.root.children.length > 1 && (
                            <CharacterDisplay />
                        )}

                    <PlannerContainer>{renderDecisionPanel()}</PlannerContainer>
                </Container>
            )}
        </>
    );
}

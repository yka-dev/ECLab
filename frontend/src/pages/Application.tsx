import { SiWire } from "react-icons/si";
import Canvas from "../components/Canvas";
import QuickActionButton from "../components/QuickActionButton";
import "./Application.css";
import { useState } from "react";
import { FaNetworkWired } from "react-icons/fa";

function Application() {
    const quiActionList = [{
        icon: <SiWire />,
        hint: "Wire",

    }, {icon: <FaNetworkWired />, hint: "Network"}]

    const [selectedAction, setSelectedAction] = useState(0);


    return (
        <div className="application-container">

            <Canvas />


            <div className="overlay-container">
                <div className="component-menu">
                    {Array.from({ length: 50 }).map((_, i) => (
                        <p key={i}>Line {i}</p>
                    ))}
                </div>
                <div className="quickAction-container">
                    <div className="quickAction-menu">
                        {quiActionList.map((action, index) => (
                            <QuickActionButton 
                                key={index}
                                isSelected={index === selectedAction}
                                icon={action.icon}
                                hint={action.hint}
                                onClick={() => setSelectedAction(index)}
                            />
                        ))}
                    </div>
                </div>
            </div>



        </div>

    );
}

export default Application;
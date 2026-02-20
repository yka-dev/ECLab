import Canvas from "../components/Canvas";
import "./Application.css";

function Application() {
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
                    {Array.from({ length: 3 }).map((_, i) => (
                            <p key={i}>Line {i}</p>
                            ))}
                </div>
            </div>
        </div> 


        
    </div>

  );
}

export default Application;
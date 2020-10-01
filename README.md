# Multi Premoves For Mouse and Keyboard
 Creating unlimited multiple premoves compatible with all Lichess styles of playing (keyboard, mouse, touchscreen)
 
# Important:
- To install, download the extension (the extension is in the "Extension" folder) and load as an unpacked extension in any Chromium browser (enable developer mode). This is the link to download this repository: https://github.com/Sentero-esp12/Multi-Premoves-Optimized/archive/master.zip . Then watch this video on how to install developer mode extensions: https://www.youtube.com/watch?v=hIRX1dpfqHc . If you still have troubles, google "install unpacked extension chrome" and read a few articles.
- Due to Lichess updates and the necessary fixes to make the extension functional, it now shows a warning at the top of the page. If you want to disable it (and it might be crucial for the working of the extension), create a Chrome shortcut and add --silent-debugger-extension-api to the 'Shortcut' --> Target field. See how it's done here:
https://www.thewindowsclub.com/wp-content/uploads/2019/07/Launch-Chrome-with-Switch-1200x790.png
Then close the browser and open it using this new shortcut (you will need to use this shortcut each time you open the browser).
Be careful. This disables an important notification, so if you accidentally install a malicious app, you won't be able to see the warning, so be careful with installing third-party Chromium extensions. 
- To access the settings, click the extension's icon (pin it if necessary)
- The option 'How do you move pieces' (https://lichess.org/account/preferences/game-behavior) should be set to either 'drag' or 'both'. Using 'drag' should be more reliable. If you use kb only and have any problems with moves, try switching to 'drag' as well. 
- For now it only supports autoqueen (and possibly autoqueen on premoves as well). If you promote to something else it might break. https://lichess.org/account/preferences/game-behavior
- Castling should be set to 'Move king onto rook'. https://lichess.org/account/preferences/game-behavior
- 'Piece animation' should be set to 'None' https://lichess.org/account/preferences/game-display
- Right mouse button is currently the default button to activate multi premoves. When it's pressed you can input multiple premoves. Or you can click the red circle below the board (it will change to green when multipremove input is activated). You can change the key in the settings.
- Currently after resizing the window or changing the board size, the page should be reloaded. 
- If you use kb extension, disable the other kb extension and activate 'Use keyboard' in the settings. There you can set the keys, and now a key for a second queen is available (last promoted queen becomes the second queen for the extension. When there are more than two queen, the extension should move the last promoted queen when the key for a second queen is pressed or a random queen out of the rest available for a move). 
- Other options: auto berserk back, rematch, berserk, resign, back to the tournament buttons, second queen key for keyboard. 
